import { and, desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getUserId } from "@/lib/auth";
import { contentToText, countParagraphs, extractBookContent, SUPPORTED_EXTENSIONS, UnreadableBookError } from "@/lib/book-text";
import { documentSummaryColumns } from "@/lib/documents";
import { createDocumentAgent, deleteAgent, deleteKnowledgeDoc, uploadKnowledgeText } from "@/lib/elevenlabs";
import { handleRouteError, jsonError } from "@/lib/http";
import { config } from "@/config";
import { activePlan, getPlan } from "@/lib/plan";
import { BookSlotsFullError, consumeUsage, countSavedBooks } from "@/lib/usage";

const { documents, readingProgress } = schema;

// Uploads wait for ElevenLabs to index the book's text before creating its agent (can take ~1 min).
export const maxDuration = 120;

// Vercel functions reject request bodies over 4.5 MB, so uploads through this route stay under that.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// GET -> the user's documents, then the catalog (public demo) books, without their text, each with
// this user's reading progress.
export async function GET() {
  try {
    const userId = await getUserId();
    const rows = await getDb()
      .select({ ...documentSummaryColumns, progress: readingProgress })
      .from(documents)
      .leftJoin(readingProgress, and(eq(readingProgress.documentId, documents.id), eq(readingProgress.userId, userId)))
      .where(or(eq(documents.userId, userId), eq(documents.isPublic, true)))
      .orderBy(documents.isPublic, desc(documents.createdAt));
    return Response.json({ documents: rows });
  } catch (err) {
    return handleRouteError(err, "Could not list documents");
  }
}

// POST multipart/form-data { file, title?, author? } -> 201 { document }
// 409 { error, code: "book_slots_full", limit } when the user already keeps as many books as their plan allows.
// Extracts the book's chapters/paragraphs, adds the text to the ElevenLabs knowledge base, and
// creates the document's own agent. Supported: .pdf .epub .txt .md .html
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Send multipart/form-data with a `file` field", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError("`file` is required", 400);
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("File is too large (max 4 MB)", 413);
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(extension)) {
    return jsonError(`Unsupported file type. Use one of: ${SUPPORTED_EXTENSIONS.join(", ")}`, 415);
  }

  const title = String(form.get("title") ?? "").trim() || file.name.slice(0, -extension.length);
  const author = String(form.get("author") ?? "").trim() || null;

  let documentId: string | undefined;
  let knowledgeBaseId: string | undefined;
  let agentId: string | undefined;
  try {
    const userId = await getUserId();
    // Own books are capped per plan (R-035): a full shelf answers 409, not 429, so the frontend's
    // limit modal stays closed and the message shows next to the upload button.
    const plan = activePlan(await getPlan(userId));
    const bookLimit = config.plans[plan].books;
    if ((await countSavedBooks(userId)) >= bookLimit) {
      const { message } = new BookSlotsFullError(bookLimit, plan);
      return Response.json({ error: message, code: "book_slots_full", limit: bookLimit }, { status: 409 });
    }
    // Parse before anything is created, so unreadable files cost nothing.
    let content;
    try {
      content = await extractBookContent(file);
    } catch (err) {
      if (err instanceof UnreadableBookError) return jsonError(err.message, 422);
      console.error(err);
      return jsonError("Could not read this file. Try an EPUB, a text-based PDF, or a .txt file.", 422);
    }

    await consumeUsage(userId, "upload");
    const db = getDb();
    [{ id: documentId }] = await db
      .insert(documents)
      .values({
        userId,
        title,
        author,
        fileName: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        content,
        chapterCount: content.chapters.length,
        paragraphCount: countParagraphs(content),
      })
      .returning({ id: documents.id });

    knowledgeBaseId = await uploadKnowledgeText(contentToText(content), title);
    agentId = await createDocumentAgent(knowledgeBaseId, title);

    const [document] = await db
      .update(documents)
      .set({ status: "ready", elevenlabsKnowledgeBaseId: knowledgeBaseId, elevenlabsAgentId: agentId, updatedAt: new Date() })
      .where(eq(documents.id, documentId))
      .returning(documentSummaryColumns);
    return Response.json({ document }, { status: 201 });
  } catch (err) {
    // Don't leave half-created ElevenLabs resources behind; keep the row as "failed" with the reason.
    await Promise.allSettled([agentId && deleteAgent(agentId), knowledgeBaseId && deleteKnowledgeDoc(knowledgeBaseId)]);
    if (documentId) {
      await getDb()
        .update(documents)
        .set({ status: "failed", error: err instanceof Error ? err.message.slice(0, 500) : String(err), updatedAt: new Date() })
        .where(eq(documents.id, documentId))
        .catch(() => {});
    }
    return handleRouteError(err, "Could not upload the document");
  }
}
