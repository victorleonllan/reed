import { config } from "@/config";
import { CATALOG_USER_ID } from "@/db/schema";
import { hasBookManifest } from "@/lib/audio-library";
import { getUserId } from "@/lib/auth";
import { findReadableDocument } from "@/lib/documents";
import { handleRouteError, jsonError } from "@/lib/http";
import { activePlan, getPlan } from "@/lib/plan";

type BookAudioStatus = "ready" | "catalog" | "queued" | "unavailable";

// GET -> { status } of the whole-book audio in the default voice (R-036):
// "ready" (manifest exists, catalog included), "catalog" (catalog book, read paragraph by paragraph),
// "queued" (own book, plan has audioBooks, not generated yet), "unavailable" (own book, plan without audioBooks).
// Params typed by hand: RouteContext<"/api/documents/[id]/audio"> only exists once Next regenerates its route types.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const document = await findReadableDocument(await getUserId(), (await ctx.params).id);
    if (!document) return jsonError("Document not found", 404);

    let status: BookAudioStatus;
    if (await hasBookManifest(config.defaultReaderVoice, document.id)) status = "ready";
    else if (document.userId === CATALOG_USER_ID) status = "catalog";
    else status = config.plans[activePlan(await getPlan(document.userId))].audioBooks ? "queued" : "unavailable";

    return Response.json({ status });
  } catch (err) {
    return handleRouteError(err, "Could not check the book's audio");
  }
}
