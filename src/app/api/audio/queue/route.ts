import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { config } from "@/config";
import { getDb, schema } from "@/db";
import { CATALOG_USER_ID } from "@/db/schema";
import { hasBookManifest } from "@/lib/audio-library";
import { handleRouteError, jsonError } from "@/lib/http";
import { activePlan, getPlan } from "@/lib/plan";

export const maxDuration = 60;

const MAX_BOOKS = 20;

// The audio machine sends `Authorization: Bearer <REED_AUDIO_MACHINE_TOKEN>`. No Clerk here.
function authorized(request: Request, token: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const received = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET -> { voice, books: [{ id, title, paragraphCount }] }: users' own ready books whose owner's
// plan includes audioBooks and that have no book manifest yet, oldest first, at most 20 (R-036).
// The audio machine polls this; the PC is never exposed to the internet.
export async function GET(request: Request) {
  const token = process.env.REED_AUDIO_MACHINE_TOKEN?.trim();
  if (!token) return jsonError("audio machine not configured", 503);
  if (!authorized(request, token)) return jsonError("Unauthorized", 401);

  try {
    const voice = config.defaultReaderVoice;
    const rows = await getDb()
      .select({
        id: schema.documents.id,
        title: schema.documents.title,
        paragraphCount: schema.documents.paragraphCount,
        userId: schema.documents.userId,
      })
      .from(schema.documents)
      .where(and(ne(schema.documents.userId, CATALOG_USER_ID), eq(schema.documents.status, "ready")))
      .orderBy(asc(schema.documents.createdAt));

    // One plan lookup per owner (getPlan also caches for 60 s). An owner whose plan can't be read is
    // skipped this round rather than failing the whole queue.
    const owners = [...new Set(rows.map((r) => r.userId))];
    const allowed = new Set<string>();
    await Promise.all(
      owners.map(async (userId) => {
        try {
          if (config.plans[activePlan(await getPlan(userId))].audioBooks) allowed.add(userId);
        } catch (err) {
          console.warn("Audio queue: could not read the plan of", userId, err);
        }
      }),
    );

    const candidates = rows.filter((r) => allowed.has(r.userId));
    const books: { id: string; title: string; paragraphCount: number }[] = [];
    // Check manifests in batches so a long backlog doesn't fire hundreds of HEADs at once.
    for (let i = 0; i < candidates.length && books.length < MAX_BOOKS; i += MAX_BOOKS) {
      const batch = candidates.slice(i, i + MAX_BOOKS);
      const done = await Promise.all(batch.map((b) => hasBookManifest(voice, b.id)));
      batch.forEach((b, j) => {
        if (!done[j] && books.length < MAX_BOOKS) books.push({ id: b.id, title: b.title, paragraphCount: b.paragraphCount });
      });
    }

    return Response.json({ voice, books });
  } catch (err) {
    return handleRouteError(err, "Could not build the audio queue");
  }
}
