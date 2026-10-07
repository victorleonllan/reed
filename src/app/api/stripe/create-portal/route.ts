import { getUserId } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { getPlan } from "@/lib/plan";
import { createPortal, getStripe, PAYMENTS_OFF_MESSAGE, PaymentsNotConfiguredError } from "@/lib/stripe";

export const runtime = "nodejs";

// POST -> { url } of the Stripe Customer Portal (change card, cancel Reed Pro).
export async function POST() {
  try {
    getStripe(); // answers 503 before touching Clerk when payments are off
    const { stripeCustomerId } = await getPlan(await getUserId());
    if (!stripeCustomerId) return jsonError("Todavía no tienes una suscripción.", 404);
    return Response.json({ url: await createPortal({ customerId: stripeCustomerId }) });
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) return jsonError(PAYMENTS_OFF_MESSAGE, 503);
    return handleRouteError(err, "Could not open the billing portal");
  }
}
