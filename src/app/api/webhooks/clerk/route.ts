import { verifyWebhook, type WebhookEvent } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { welcomeEmail } from "@/lib/emails";
import { jsonError } from "@/lib/http";
import { sendEmail } from "@/lib/resend";

export const runtime = "nodejs";

// Clerk webhook: sends Reed's welcome email when an account is created. It authenticates with the
// webhook signature, not the session. Configure in Clerk → Webhooks, URL <deploy>/api/webhooks/clerk,
// event user.created, and put its signing secret in CLERK_WEBHOOK_SIGNING_SECRET.
export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return jsonError("CLERK_WEBHOOK_SIGNING_SECRET is not set", 503);

  let event: WebhookEvent;
  try {
    event = await verifyWebhook(request);
  } catch {
    return jsonError("Invalid signature", 400);
  }

  if (event.type === "user.created") {
    const user = event.data;
    const email =
      user.email_addresses.find((address) => address.id === user.primary_email_address_id)?.email_address ??
      user.email_addresses[0]?.email_address;
    if (email) {
      // sendEmail never throws, so Clerk always gets 200 and doesn't resend the welcome.
      await sendEmail({ to: email, ...welcomeEmail({ name: user.first_name }) });
    } else {
      console.info(`Clerk user ${user.id} has no email address; welcome email not sent`);
    }
  }
  // Other events are acknowledged without action.
  return Response.json({ received: true });
}
