import { currentUser } from "@clerk/nextjs/server";
import { getUserId } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { getPlan, isPro } from "@/lib/plan";
import { createCheckout, getStripe, PAID_PLANS, PAYMENTS_OFF_MESSAGE, PaymentsNotConfiguredError } from "@/lib/stripe";

export const runtime = "nodejs";

// POST { plan: "basico" | "pro" | "biblioteca", interval: "month" | "year" } -> { url } of a Stripe
// Checkout. The price is chosen here from plan and interval: the browser never sees price ids or keys.
export async function POST(request: Request) {
  try {
    getStripe(); // answers 503 before touching Clerk when payments are off
    const userId = await getUserId();

    const body = await request.json().catch(() => null);
    const plan = PAID_PLANS.find((id) => id === body?.plan);
    if (!plan) return jsonError("Elige Reed Básico, Reed Pro o Reed Biblioteca.", 400);
    const interval = body?.interval;
    if (interval !== "month" && interval !== "year") return jsonError("Elige el plan mensual o el anual.", 400);

    const info = await getPlan(userId);
    // Plan changes go through the Stripe portal, so a second subscription is never created here.
    if (isPro(info)) return jsonError('Ya tienes un plan. Cámbialo desde "Gestionar suscripción".', 409);

    const user = await currentUser();
    const url = await createCheckout({
      userId,
      email: user?.primaryEmailAddress?.emailAddress,
      plan,
      interval,
      customerId: info.stripeCustomerId,
    });
    return Response.json({ url });
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) return jsonError(PAYMENTS_OFF_MESSAGE, 503);
    return handleRouteError(err, "Could not start checkout");
  }
}
