// Audio machine (R-031): generates the reader's audio for catalog books with VoiceStudio and
// uploads it to the pre-generated audio library (R-029), where /api/tts finds it (R-030).
//   npm run audio:generate -- --catalog --dry-run      # count paragraphs and credits, no calls
//   npm run audio:generate -- --catalog --limit 5      # first 5 new paragraphs, to listen
//   npm run audio:generate -- --book <documentId> --voice mauricio
// Resumable: a paragraph whose file already exists is skipped, so after a cut just run it again.
// Reads the database only (one select of documents); it never writes to it.
// Needs .env / .env.local with DATABASE_URL, and (except --dry-run) BLOB_READ_WRITE_TOKEN and
// REED_AUDIO_BASE_URL. VOICESTUDIO_URL defaults to http://127.0.0.1:3900.
import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { parseArgs } from "node:util";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { put } = await import("@vercel/blob");
const { getDb, schema } = await import("../src/db");
const { CATALOG_USER_ID } = await import("../src/db/schema");
const { config } = await import("../src/config");
const { audioKey, libraryAudioUrl, normalizeForAudio } = await import("../src/lib/audio-library");
type ReaderVoice = import("../src/config").ReaderVoice;
type BookContent = import("../src/lib/book-text").BookContent;

// ElevenLabs credits per character for read-aloud (R-025): what each generated paragraph saves.
const ELEVENLABS_CREDITS_PER_CHAR = 0.44;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const USAGE = `Usage: npm run audio:generate -- (--catalog | --book <documentId> [--book <id>...]) [options]
  --catalog            every catalog book that is ready
  --book <id>          one book by its document id (repeatable)
  --voice <name>       ${Object.keys(config.readerVoices).join(" | ")} (default: ${config.defaultReaderVoice})
  --limit <n>          stop after n generated paragraphs
  --dry-run            count paragraphs, characters and credits; call nothing, upload nothing`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let args;
try {
  args = parseArgs({
    options: {
      catalog: { type: "boolean", default: false },
      book: { type: "string", multiple: true, default: [] },
      voice: { type: "string", default: config.defaultReaderVoice },
      limit: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  }).values;
} catch (err) {
  fail(`${err instanceof Error ? err.message : err}\n\n${USAGE}`);
}

const dryRun = args["dry-run"];
const bookIds = args.book;
if (!args.catalog && !bookIds.length) fail(USAGE);
const badId = bookIds.find((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
if (badId) fail(`"${badId}" is not a document id (a UUID).\n\n${USAGE}`);
if (!Object.hasOwn(config.readerVoices, args.voice)) fail(`Unknown voice "${args.voice}".\n\n${USAGE}`);
const voice = args.voice as ReaderVoice;
const limit = args.limit === undefined ? Infinity : Number(args.limit);
if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) fail(`--limit must be a positive integer.\n\n${USAGE}`);

const required = dryRun ? ["DATABASE_URL"] : ["DATABASE_URL", "BLOB_READ_WRITE_TOKEN", "REED_AUDIO_BASE_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) fail(`Missing ${missing.join(", ")} in .env.local or .env. See .env.example and the README.`);

const voiceStudioUrl = (process.env.VOICESTUDIO_URL?.trim() || "http://127.0.0.1:3900").replace(/\/+$/, "");
const voiceStudioKey = process.env.VOICESTUDIO_API_KEY?.trim();
const canCheckLibrary = Boolean(process.env.REED_AUDIO_BASE_URL?.trim());

async function existsInLibrary(text: string): Promise<boolean> {
  const url = libraryAudioUrl(voice, text);
  if (!url) return false;
  const res = await fetch(url, { method: "HEAD" });
  return res.status === 200;
}

async function synthesize(text: string): Promise<ArrayBuffer> {
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
async function generate(text: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const audio = await synthesize(text);
      await put(audioKey(voice, text), audio, { access: "public", addRandomSuffix: false, contentType: "audio/mpeg" });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const db = getDb();
const books = await db
  .select({ id: schema.documents.id, title: schema.documents.title, content: schema.documents.content })
  .from(schema.documents)
  .where(
    args.catalog
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

const totals = { generated: 0, skipped: 0, failed: 0, chars: 0 };
// Keys handled in this run: a paragraph repeated in a book is generated once.
const seen = new Set<string>();

run: for (const book of books) {
  const chapters = (book.content as BookContent | null)?.chapters ?? [];
  console.log(`\n${book.title} (${book.id})`);
  if (!chapters.length) console.log("  no content; skipping.");
  for (const chapter of chapters) {
    const counts = { done: 0, fresh: 0, existing: 0, failed: 0 };
    const texts = chapter.paragraphs.map(normalizeForAudio).filter(Boolean);
    for (const text of texts) {
      if (totals.generated >= limit) {
        console.log(`  Cap. ${chapter.number} — ${counts.done}/${texts.length} · ${counts.fresh} nuevos · ${counts.existing} ya estaban (limit reached)`);
        break run;
      }
      const key = audioKey(voice, text);
      if (seen.has(key) || (canCheckLibrary && (await existsInLibrary(text)))) {
        seen.add(key);
        counts.done++;
        counts.existing++;
        totals.skipped++;
        continue;
      }
      seen.add(key);
      if (!dryRun) {
        try {
          await generate(text);
        } catch (err) {
          counts.failed++;
          totals.failed++;
          console.error(`  ! Cap. ${chapter.number}, "${text.slice(0, 60)}…": ${err instanceof Error ? err.message : err}`);
          continue;
        }
      }
      counts.done++;
      counts.fresh++;
      totals.generated++;
      totals.chars += text.length;
    }
    const failedNote = counts.failed ? ` · ${counts.failed} fallidos` : "";
    console.log(`  Cap. ${chapter.number} — ${counts.done}/${texts.length} · ${counts.fresh} nuevos · ${counts.existing} ya estaban${failedNote}`);
  }
}

const credits = Math.round(totals.chars * ELEVENLABS_CREDITS_PER_CHAR);
console.log(
  `\n${dryRun ? "Would generate" : "Generated"} ${totals.generated} · skipped ${totals.skipped} · failed ${totals.failed} · ` +
    `${totals.chars} characters · ~${credits} ElevenLabs credits avoided`,
);
if (dryRun) console.log("Dry run: nothing generated or uploaded.");
else if (totals.failed) console.log("Some paragraphs failed; run the same command again to retry them.");
process.exit(totals.failed ? 1 : 0);
