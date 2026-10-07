import { currentUser } from "@clerk/nextjs/server";
import { getUserId } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { getPlan, isPro } from "@/lib/plan";
import { createCheckout, getStripe, PAYMENTS_OFF_MESSAGE, PaymentsNotConfiguredError } from "@/lib/stripe";

export const runtime = "nodejs";

// POST { interval: "month" | "year" } -> { url } of a Stripe Checkout for Reed Pro.
// The price is chosen here from the interval: the browser never sees price ids or keys.
export async function POST(request: Request) {
  try {
    getStripe(); // answers 503 before touching Clerk when payments are off
    const userId = await getUserId();

    const body = await request.json().catch(() => null);
    const interval = body?.interval;
    if (interval !== "month" && interval !== "year") return jsonError("Elige el plan mensual o el anual.", 400);

    const plan = await getPlan(userId);
    if (isPro(plan)) return jsonError("Ya tienes Reed Pro.", 409);

    const user = await currentUser();
    const url = await createCheckout({
      userId,
      email: user?.primaryEmailAddress?.emailAddress,
      interval,
      customerId: plan.stripeCustomerId,
    });
    return Response.json({ url });
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) return jsonError(PAYMENTS_OFF_MESSAGE, 503);
    return handleRouteError(err, "Could not start checkout");
  }
}
