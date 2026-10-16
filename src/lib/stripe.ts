import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { config } from "@/config";
import { proActivatedEmail } from "./emails";
import type { PaidPlanId, PlanId, PlanInfo } from "./plan";
import { sendEmail } from "./resend";

/** STRIPE_SECRET_KEY (or a Pro price id) is missing: routes answer 503 instead of crashing. */
export class PaymentsNotConfiguredError extends Error {
  constructor(message = "Stripe is not configured") {
    super(message);
  }
}

export const PAYMENTS_OFF_MESSAGE = "Los pagos todavía no están activos.";

export type BillingInterval = "month" | "year";

let client: Stripe | null = null;

/** Lazy Stripe client, so the build and the free plan work without keys. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export const PAID_PLANS: readonly PaidPlanId[] = ["basico", "pro", "biblioteca"];

/** Subscription Checkout for a paid plan; returns the URL to send the browser to. */
export async function createCheckout({
  userId,
  email,
  plan,
  interval,
  customerId,
}: {
  userId: string;
  email?: string | null;
  plan: PaidPlanId;
  interval: BillingInterval;
  customerId?: string | null;
}): Promise<string> {
  const stripe = getStripe();
  const { name, stripePriceMonthly, stripePriceYearly } = config.plans[plan];
  const price = interval === "year" ? stripePriceYearly : stripePriceMonthly;
  if (!price) throw new PaymentsNotConfiguredError(`${name} ${interval}ly price id is not set`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    // Every subscription event then carries the Clerk user, without a lookup table.
    subscription_data: { metadata: { userId, plan } },
    ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
    allow_promotion_codes: true,
    success_url: `${config.siteUrl}${config.appPath}?checkout=ok`,
    cancel_url: `${config.siteUrl}${config.appPath}?checkout=cancelado`,
  });
  if (!session.url) throw new Error(`Checkout session ${session.id} has no url`);
  return session.url;
}

/** The paid plan a Stripe price belongs to (any of the six in config.plans), or null. */
export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of PAID_PLANS) {
    const { stripePriceMonthly, stripePriceYearly } = config.plans[plan];
    if (priceId === stripePriceMonthly || priceId === stripePriceYearly) return plan;
  }
  return null;
}

/** Customer Portal session (change card, cancel); returns its URL. */
export async function createPortal({ customerId }: { customerId: string }): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${config.siteUrl}${config.appPath}`,
  });
  return session.url;
}

/** Maps Stripe's subscription status onto the three states Reed keeps in Clerk. */
export function toPlanStatus(status: Stripe.Subscription.Status): PlanInfo["status"] {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    // Stripe is still retrying the charge (or waiting for the first one): keep access meanwhile.
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default: // canceled, incomplete_expired, paused
      return "canceled";
  }
}

/** End of the paid period as ISO. Since API 2025-03-31 the period lives on each item, not the subscription. */
export function periodEnd(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

/** Runs after a successful checkout: sends the Reed Pro email. Failures are logged, never thrown. */
export async function onProActivated(userId: string): Promise<void> {
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) {
      console.info(`Clerk user ${userId} has no email address; Reed Pro email not sent`);
      return;
    }
    await sendEmail({ to: email, ...proActivatedEmail({ name: user.firstName }) });
  } catch (err) {
    // The plan is already saved; a missing email must not make Stripe retry the whole event.
    console.error(`Reed Pro email for ${userId} failed:`, err);
  }
}
