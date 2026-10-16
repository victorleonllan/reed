import { getUserId } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { usageSummary } from "@/lib/usage";

// GET -> { usage: { tts_chars: { used, limit }, ... }, books: { used, limit }, activePlan,
// plan: { plan, status, renewsAt } }; usage covers the last 30 days.
// Stripe ids stay on the server: the browser has no use for them.
export async function GET() {
  try {
    const { usage, books, activePlan, plan } = await usageSummary(await getUserId());
    return Response.json({ usage, books, activePlan, plan: { plan: plan.plan, status: plan.status, renewsAt: plan.renewsAt } });
  } catch (err) {
    return handleRouteError(err, "Could not load usage");
  }
}
