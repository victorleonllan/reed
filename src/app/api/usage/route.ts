import { getUserId } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { usageSummary } from "@/lib/usage";

// GET -> { usage: { tts_chars: { used, limit }, ... }, plan: { plan, status, renewsAt } } over the last 24h.
// Stripe ids stay on the server: the browser has no use for them.
export async function GET() {
  try {
    const { usage, plan } = await usageSummary(await getUserId());
    return Response.json({ usage, plan: { plan: plan.plan, status: plan.status, renewsAt: plan.renewsAt } });
  } catch (err) {
    return handleRouteError(err, "Could not load usage");
  }
}
