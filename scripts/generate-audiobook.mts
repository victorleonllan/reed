// Audio machine (R-031): generates the reader's audio for catalog books with VoiceStudio and
// uploads it to the pre-generated audio library (R-029), where /api/tts finds it (R-030).
//   npm run audio:generate -- --catalog --dry-run      # count paragraphs and credits, no calls
//   npm run audio:generate -- --catalog --limit 5      # first 5 new paragraphs, to listen
//   npm run audio:generate -- --book <documentId> --voice mauricio
//   npm run audio:generate -- --queue --watch          # serve the users' books queue (R-037)
//   npm run audio:generate -- --prune [--yes]          # delete audio no book uses (R-037)
// Resumable: a paragraph whose file already exists is skipped, so after a cut just run it again.
// A book whose paragraphs are all in the bucket gets its manifest (R-036), which marks it done.
// Reads the database only (selects of documents); it never writes to it.
// Needs .env / .env.local with DATABASE_URL, and (except --dry-run) R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET and REED_AUDIO_BASE_URL (R-032: the library lives in Cloudflare R2).
// --queue also needs REED_APP_URL and REED_AUDIO_MACHINE_TOKEN. R2_MAX_GB caps the bucket (default 9).
// VOICESTUDIO_URL defaults to http://127.0.0.1:3900.
import { AwsClient } from "aws4fetch";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { parseArgs } from "node:util";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { getDb, schema } = await import("../src/db");
const { CATALOG_USER_ID } = await import("../src/db/schema");
const { config } = await import("../src/config");
const { audioKey, bookManifestKey, libraryAudioUrl, normalizeForAudio } = await import("../src/lib/audio-library");
type ReaderVoice = import("../src/config").ReaderVoice;
type BookContent = import("../src/lib/book-text").BookContent;
type BookManifest = import("../src/lib/audio-library").BookManifest;

// ElevenLabs credits per character for read-aloud (R-025): what each generated paragraph saves.
const ELEVENLABS_CREDITS_PER_CHAR = 0.44;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_WATCH_MINUTES = 10;
// Decimal GB (10^9 bytes): stays under R2's 10 GB free tier whichever unit Cloudflare bills in.
const DEFAULT_R2_MAX_GB = 9;
const BYTES_PER_GB = 1e9;
const DELETE_CONCURRENCY = 8;

const USAGE = `Usage: npm run audio:generate -- (--catalog | --book <documentId> [--book <id>...] | --queue | --prune) [options]
  --catalog            every catalog book that is ready
  --book <id>          one book by its document id (repeatable)
  --queue              the users' books waiting for audio (GET \${REED_APP_URL}/api/audio/queue)
  --prune              list the audio no ready book uses; add --yes to delete it
  --voice <name>       ${Object.keys(config.readerVoices).join(" | ")} (default: ${config.defaultReaderVoice}; --catalog/--book only)
  --limit <n>          stop after n generated paragraphs (--catalog/--book only)
  --dry-run            count paragraphs, characters and credits; call nothing, upload nothing (--catalog/--book only)
  --watch [minutes]    with --queue: ask again every N minutes (default ${DEFAULT_WATCH_MINUTES}) until Ctrl+C
  --yes                with --prune: really delete`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// `--watch` takes an optional value, which parseArgs can't express: normalize it to `--watch=N`.
function normalizeArgv(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--watch") {
      out.push(argv[i]);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && /^\d+(\.\d+)?$/.test(next)) {
      out.push(`--watch=${next}`);
      i++;
    } else {
      out.push(`--watch=${DEFAULT_WATCH_MINUTES}`);
    }
  }
  return out;
}

let args;
try {
  args = parseArgs({
    args: normalizeArgv(process.argv.slice(2)),
    options: {
      catalog: { type: "boolean", default: false },
      book: { type: "string", multiple: true, default: [] },
      queue: { type: "boolean", default: false },
      prune: { type: "boolean", default: false },
      voice: { type: "string" },
      limit: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      watch: { type: "string" },
      yes: { type: "boolean", default: false },
    },
  }).values;
} catch (err) {
  fail(`${err instanceof Error ? err.message : err}\n\n${USAGE}`);
}

const bookIds = args.book;
const modes = [args.catalog, bookIds.length > 0, args.queue, args.prune].filter(Boolean).length;
if (modes !== 1) fail(USAGE);
const mode = args.catalog ? "catalog" : bookIds.length ? "book" : args.queue ? "queue" : "prune";
const generatesFromDb = mode === "catalog" || mode === "book";
if (!generatesFromDb && (args.voice !== undefined || args.limit !== undefined || args["dry-run"])) {
  fail(`--voice, --limit and --dry-run go with --catalog or --book.\n\n${USAGE}`);
}
if (args.watch !== undefined && mode !== "queue") fail(`--watch goes with --queue.\n\n${USAGE}`);
if (args.yes && mode !== "prune") fail(`--yes goes with --prune.\n\n${USAGE}`);

const dryRun = args["dry-run"];
const confirmDelete = args.yes;
const badId = bookIds.find((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
if (badId) fail(`"${badId}" is not a document id (a UUID).\n\n${USAGE}`);
const voiceArg = args.voice ?? config.defaultReaderVoice;
if (!isReaderVoice(voiceArg)) fail(`Unknown voice "${voiceArg}".\n\n${USAGE}`);
const limit = args.limit === undefined ? Infinity : Number(args.limit);
if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) fail(`--limit must be a positive integer.\n\n${USAGE}`);
const watchMinutes = args.watch === undefined ? null : Number(args.watch);
if (watchMinutes !== null && !(watchMinutes > 0)) fail(`--watch takes a positive number of minutes.\n\n${USAGE}`);
const maxGbRaw = process.env.R2_MAX_GB?.trim();
const maxGb = maxGbRaw ? Number(maxGbRaw) : DEFAULT_R2_MAX_GB;
if (!(maxGb > 0)) fail(`R2_MAX_GB must be a positive number of GB (got "${maxGbRaw}").`);

const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const required =
  mode === "prune"
    ? ["DATABASE_URL", ...R2_ENV]
    : dryRun
      ? ["DATABASE_URL"]
      : [
          "DATABASE_URL",
          ...R2_ENV,
          "REED_AUDIO_BASE_URL",
          ...(mode === "queue" ? ["REED_APP_URL", "REED_AUDIO_MACHINE_TOKEN"] : []),
        ];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) fail(`Missing ${missing.join(", ")} in .env.local or .env. See .env.example and the README.`);

const voiceStudioUrl = (process.env.VOICESTUDIO_URL?.trim() || "http://127.0.0.1:3900").replace(/\/+$/, "");
const voiceStudioKey = process.env.VOICESTUDIO_API_KEY?.trim();
const canCheckLibrary = Boolean(process.env.REED_AUDIO_BASE_URL?.trim());
const r2 = dryRun
  ? null
  : new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
      service: "s3",
      region: "auto",
    });
const r2BucketUrl = `https://${process.env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com/${process.env.R2_BUCKET?.trim()}`;

function isReaderVoice(name: string): name is ReaderVoice {
  return Object.hasOwn(config.readerVoices, name);
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ---------- R2 ----------

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Every object in the bucket (optionally under a prefix), paginated by continuation token.
async function listObjects(prefix?: string): Promise<{ key: string; size: number }[]> {
  const objects: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const params = new URLSearchParams({ "list-type": "2" });
    if (prefix) params.set("prefix", prefix);
    if (token) params.set("continuation-token", token);
    const res = await r2!.fetch(`${r2BucketUrl}?${params}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const xml = await res.text();
    if (res.status !== 200) throw new Error(`R2 list ${res.status}: ${xml.slice(0, 200)}`);
    for (const [, block] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
      const size = /<Size>(\d+)<\/Size>/.exec(block)?.[1];
      if (key !== undefined) objects.push({ key: decodeXml(key), size: Number(size ?? 0) });
    }
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    token = truncated ? decodeXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "") : undefined;
    if (truncated && !token) throw new Error("R2 list: truncated without a continuation token");
  } while (token);
  return objects;
}

async function bucketBytes(): Promise<number> {
  return (await listObjects()).reduce((sum, o) => sum + o.size, 0);
}

function formatGb(bytes: number): string {
  return (bytes / BYTES_PER_GB).toFixed(2);
}

// Null when there's room; otherwise the message to print before stopping.
async function bucketFull(): Promise<string | null> {
  const bytes = await bucketBytes();
  if (bytes <= maxGb * BYTES_PER_GB) return null;
  return `Bucket en ${formatGb(bytes)} GB, tope R2_MAX_GB = ${maxGb}: no genero más. Sube R2_MAX_GB o corre --prune.`;
}

async function putObject(key: string, body: ArrayBuffer | string, headers: Record<string, string>): Promise<void> {
  const res = await r2!.fetch(`${r2BucketUrl}/${key}`, {
    method: "PUT",
    headers,
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status !== 200) throw new Error(`R2 ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function deleteObject(key: string): Promise<void> {
  const res = await r2!.fetch(`${r2BucketUrl}/${key}`, { method: "DELETE", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (res.status !== 204 && res.status !== 200) throw new Error(`R2 delete ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// ---------- Generation ----------

async function existsInLibrary(voice: ReaderVoice, text: string): Promise<boolean> {
  const url = libraryAudioUrl(voice, text);
  if (!url) return false;
  const res = await fetch(url, { method: "HEAD" });
  return res.status === 200;
}

async function synthesize(voice: ReaderVoice, text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${voiceStudioUrl}/v1/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(voiceStudioKey ? { Authorization: `Bearer ${voiceStudioKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.localTts.model,
      input: text,
      voice: config.readerVoices[voice].localProfile,
      response_format: "mp3",
      language: config.localTts.language,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`VoiceStudio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.arrayBuffer();
}

// One attempt plus one retry; the caller logs the paragraph and moves on if both fail.
// The key never changes content (a new voice or engine bumps libraryVersion), so it caches forever.
async function generate(voice: ReaderVoice, text: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const audio = await synthesize(voice, text);
      await putObject(audioKey(voice, text), audio, {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// The manifest is what "this book is fully generated" means (R-036); no-cache so the app sees it.
async function uploadManifest(voice: ReaderVoice, documentId: string, paragraphs: number): Promise<void> {
  const manifest: BookManifest = {
    documentId,
    voice,
    libraryVersion: config.localTts.libraryVersion,
    paragraphs,
    generatedAt: new Date().toISOString(),
  };
  await putObject(bookManifestKey(voice, documentId), JSON.stringify(manifest), {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  });
}

type Book = { id: string; title: string; content: unknown };

const totals = { generated: 0, skipped: 0, failed: 0, chars: 0 };
// Keys handled in this run: a paragraph repeated in a book is generated once, and one that already
// failed twice isn't retried again in the same run.
const doneKeys = new Set<string>();
const failedKeys = new Set<string>();

function bookTexts(book: Book): { number: number; texts: string[] }[] {
  const chapters = (book.content as BookContent | null)?.chapters ?? [];
  return chapters.map((chapter) => ({
    number: chapter.number,
    texts: chapter.paragraphs.map(normalizeForAudio).filter(Boolean),
  }));
}

// Generates the missing paragraphs of one book. Returns its paragraph count and whether every one
// of them is in the bucket (then its manifest is uploaded). `verbose` prints a line per chapter.
async function processBook(book: Book, voice: ReaderVoice, verbose: boolean): Promise<{ paragraphs: number; complete: boolean; limitReached: boolean }> {
  const chapters = bookTexts(book);
  const paragraphs = chapters.reduce((n, c) => n + c.texts.length, 0);
  if (verbose && !chapters.length) console.log("  no content; skipping.");
  let complete = true;
  let limitReached = false;
  book: for (const chapter of chapters) {
    const counts = { done: 0, fresh: 0, existing: 0, failed: 0 };
    for (const text of chapter.texts) {
      if (totals.generated >= limit) {
        limitReached = true;
        complete = false;
        if (verbose) console.log(`  Cap. ${chapter.number} — ${counts.done}/${chapter.texts.length} · ${counts.fresh} nuevos · ${counts.existing} ya estaban (limit reached)`);
        break book;
      }
      const key = audioKey(voice, text);
      if (failedKeys.has(key)) {
        counts.failed++;
        complete = false;
        continue;
      }
      if (doneKeys.has(key) || (canCheckLibrary && (await existsInLibrary(voice, text)))) {
        doneKeys.add(key);
        counts.done++;
        counts.existing++;
        totals.skipped++;
        continue;
      }
      if (!dryRun) {
        try {
          await generate(voice, text);
        } catch (err) {
          failedKeys.add(key);
          counts.failed++;
          totals.failed++;
          complete = false;
          console.error(`  ! Cap. ${chapter.number}, "${text.slice(0, 60)}…": ${errorText(err)}`);
          continue;
        }
      }
      doneKeys.add(key);
      counts.done++;
      counts.fresh++;
      totals.generated++;
      totals.chars += text.length;
    }
    const failedNote = counts.failed ? ` · ${counts.failed} fallidos` : "";
    if (verbose) console.log(`  Cap. ${chapter.number} — ${counts.done}/${chapter.texts.length} · ${counts.fresh} nuevos · ${counts.existing} ya estaban${failedNote}`);
  }
  if (complete && !dryRun) {
    try {
      await uploadManifest(voice, book.id, paragraphs);
    } catch (err) {
      complete = false;
      totals.failed++;
      console.error(`  ! Manifiesto de ${book.title}: ${errorText(err)}`);
    }
  }
  return { paragraphs, complete, limitReached };
}

function printTotals(): void {
  const credits = Math.round(totals.chars * ELEVENLABS_CREDITS_PER_CHAR);
  console.log(
    `\n${dryRun ? "Would generate" : "Generated"} ${totals.generated} · skipped ${totals.skipped} · failed ${totals.failed} · ` +
      `${totals.chars} characters · ~${credits} ElevenLabs credits avoided`,
  );
}

// ---------- Modes ----------

const db = getDb();

async function runCatalogOrBooks(voice: ReaderVoice): Promise<never> {
  const books = await db
    .select({ id: schema.documents.id, title: schema.documents.title, content: schema.documents.content })
    .from(schema.documents)
    .where(
      mode === "catalog"
        ? and(eq(schema.documents.userId, CATALOG_USER_ID), eq(schema.documents.status, "ready"))
        : inArray(schema.documents.id, bookIds),
    );
  if (!books.length) fail("No books found.");
  for (const id of bookIds) if (!books.some((b) => b.id === id)) console.error(`! Book ${id} not found; skipping it.`);

  console.log(
    `${dryRun ? "Dry run" : "Generating"} · voice ${voice} (${config.readerVoices[voice].localProfile}) · ` +
      `${books.length} book(s)${dryRun ? "" : ` · VoiceStudio ${voiceStudioUrl}`}`,
  );
  if (dryRun && !canCheckLibrary) console.log("REED_AUDIO_BASE_URL is not set: every paragraph is counted as new.");

  for (const book of books) {
    if (!dryRun) {
      const full = await bucketFull();
      if (full) {
        console.error(full);
        printTotals();
        process.exit(2);
      }
    }
    console.log(`\n${book.title} (${book.id})`);
    const { limitReached } = await processBook(book, voice, true);
    if (limitReached) break;
  }

  printTotals();
  if (dryRun) console.log("Dry run: nothing generated or uploaded.");
  else if (totals.failed) console.log("Some paragraphs failed; run the same command again to retry them.");
  process.exit(totals.failed ? 1 : 0);
}

type QueueResponse = { voice: string; books: { id: string; title: string; paragraphCount: number }[] };

async function fetchQueue(): Promise<QueueResponse> {
  const appUrl = process.env.REED_APP_URL!.trim().replace(/\/+$/, "");
  const res = await fetch(`${appUrl}/api/audio/queue`, {
    headers: { Authorization: `Bearer ${process.env.REED_AUDIO_MACHINE_TOKEN!.trim()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Queue ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as QueueResponse;
}

function clock(): string {
  return new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

// One pass over the queue. "full" means the bucket cap stopped it.
async function queuePass(): Promise<"ok" | "full"> {
  const queue = await fetchQueue();
  if (!isReaderVoice(queue.voice)) throw new Error(`Queue answered an unknown voice "${queue.voice}".`);
  const voice = queue.voice;
  if (!queue.books.length) {
    console.log(`${clock()} · cola vacía`);
    return "ok";
  }
  const found = await db
    .select({ id: schema.documents.id, title: schema.documents.title, content: schema.documents.content })
    .from(schema.documents)
    .where(inArray(schema.documents.id, queue.books.map((b) => b.id)));
  for (const queued of queue.books) {
    const full = await bucketFull();
    if (full) {
      console.error(full);
      return "full";
    }
    const book = found.find((b) => b.id === queued.id);
    if (!book) {
      console.error(`! ${queued.title} (${queued.id}) is not in the database anymore; skipping it.`);
      continue;
    }
    const started = Date.now();
    const { paragraphs, complete } = await processBook(book, voice, false);
    const minutes = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`${book.title} — ${paragraphs} párrafos — ${minutes} min${complete ? "" : " (incompleto; vuelve en la próxima pasada)"}`);
  }
  return "ok";
}

async function runQueue(): Promise<never> {
  console.log(`Queue · VoiceStudio ${voiceStudioUrl}${watchMinutes ? ` · every ${watchMinutes} min (Ctrl+C to stop)` : ""}`);
  if (watchMinutes === null) {
    const result = await queuePass();
    printTotals();
    process.exit(result === "full" ? 2 : totals.failed ? 1 : 0);
  }
  for (;;) {
    try {
      await queuePass();
    } catch (err) {
      console.error(`${clock()} · ${errorText(err)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, watchMinutes * 60000));
  }
}

async function runPrune(): Promise<never> {
  const prefix = `audio/${config.localTts.libraryVersion}/`;
  const docs = await db
    .select({ id: schema.documents.id, userId: schema.documents.userId, content: schema.documents.content })
    .from(schema.documents)
    .where(eq(schema.documents.status, "ready"));

  // Catalog books in every voice; users' books in the default voice (R-036). The key is the hash
  // of the text (R-029), so a paragraph two books share stays while either of them exists.
  const inUse = new Set<string>();
  const allVoices = Object.keys(config.readerVoices).filter(isReaderVoice);
  for (const doc of docs) {
    const voices = doc.userId === CATALOG_USER_ID ? allVoices : [config.defaultReaderVoice];
    const texts = bookTexts({ id: doc.id, title: "", content: doc.content }).flatMap((c) => c.texts);
    for (const voice of voices) {
      inUse.add(bookManifestKey(voice, doc.id));
      for (const text of texts) inUse.add(audioKey(voice, text));
    }
  }

  const objects = await listObjects(prefix);
  const orphans = objects.filter((o) => !inUse.has(o.key));
  const mb = (orphans.reduce((sum, o) => sum + o.size, 0) / 1e6).toFixed(1);
  console.log(`${docs.length} ready book(s) · ${objects.length} file(s) under ${prefix} · ${orphans.length} unused (${mb} MB)`);
  if (!confirmDelete) {
    console.log(orphans.length ? `Would delete ${orphans.length} file(s), ${mb} MB. Run again with --yes to delete them.` : "Nothing to delete.");
    process.exit(0);
  }

  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < orphans.length; i += DELETE_CONCURRENCY) {
    const batch = orphans.slice(i, i + DELETE_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((o) => deleteObject(o.key)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled") deleted++;
      else {
        failed++;
        console.error(`  ! ${batch[j].key}: ${errorText(r.reason)}`);
      }
    });
  }
  console.log(`Deleted ${deleted} file(s)${failed ? ` · ${failed} failed; run it again to retry them` : ""}.`);
  process.exit(failed ? 1 : 0);
}

if (mode === "queue") await runQueue();
else if (mode === "prune") await runPrune();
else await runCatalogOrBooks(voiceArg);
