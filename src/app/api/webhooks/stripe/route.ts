import type Stripe from "stripe";
import { jsonError } from "@/lib/http";
import { setPlan } from "@/lib/plan";
import { getStripe, onProActivated, PaymentsNotConfiguredError, periodEnd, toPlanStatus } from "@/lib/stripe";

export const runtime = "nodejs";

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : value?.id ?? null);

// Stripe webhook: keeps the Reed Pro plan in Clerk (src/lib/plan.ts) in sync with the subscription.
// It authenticates with the Stripe signature, not Clerk. Configure in Stripe → Developers → Webhooks,
// URL <deploy>/api/webhooks/stripe, and put its signing secret in STRIPE_WEBHOOK_SECRET.
// Idempotent: every write sets absolute values, so a redelivered event leaves the same state.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) return jsonError(err.message, 503);
    throw err;
  }
  if (!secret) return jsonError("STRIPE_WEBHOOK_SECRET is not set", 503);

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing stripe-signature", 400);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return jsonError("Invalid signature", 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const subscriptionId = idOf(session.subscription);
        if (!userId || session.mode !== "subscription" || !subscriptionId) {
          console.error(`Stripe checkout ${session.id} has no Reed user or subscription; plan not changed`);
          break;
        }
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await setPlan(userId, {
          plan: "pro",
          status: "active",
          stripeCustomerId: idOf(session.customer),
          stripeSubscriptionId: subscriptionId,
          renewsAt: periodEnd(subscription),
        });
        await onProActivated(userId);
        break;
      }

      case "customer.subscription.updated": {
        // Events can arrive out of order, so read the subscription as it is now, not the snapshot.
        const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
        const userId = subscription.metadata.userId;
        if (!userId) break; // not created by Reed's checkout
        const status = toPlanStatus(subscription.status);
        // With cancel_at_period_end Stripe keeps it "active" until renewsAt, so the user stays Pro until then.
        await setPlan(userId, {
          plan: status === "canceled" ? "free" : "pro",
          status,
          stripeCustomerId: idOf(subscription.customer),
          stripeSubscriptionId: status === "canceled" ? null : subscription.id,
          renewsAt: status === "canceled" ? null : periodEnd(subscription),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const userId = event.data.object.metadata.userId;
        if (!userId) break;
        // stripeCustomerId is kept so the portal still opens (invoices, a new card).
        await setPlan(userId, { plan: "free", status: "canceled", stripeSubscriptionId: null, renewsAt: null });
        break;
      }

      case "invoice.payment_failed": {
        const details = event.data.object.parent?.subscription_details;
        if (!details) break; // not a subscription invoice
        let userId = details.metadata?.userId;
        if (!userId) {
          const subscription = await stripe.subscriptions.retrieve(idOf(details.subscription)!);
          userId = subscription.metadata.userId;
        }
        if (!userId) break;
        await setPlan(userId, { status: "past_due" });
        break;
      }

      default:
      // Other events are acknowledged so Stripe doesn't retry them.
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error(`Stripe webhook ${event.type} (${event.id}) failed:`, err);
    // 5xx makes Stripe retry later.
    return jsonError("Could not process the event", 500);
  }
}
