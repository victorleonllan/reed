import { Resend } from "resend";
import { config } from "@/config";

let client: Resend | null = null;

/**
 * Sends one email from Reed's admin address. Without RESEND_API_KEY it logs and skips; a Resend
 * failure is logged too. It never throws, so the webhook that called it still answers 200.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`email omitido: RESEND_API_KEY is not set («${subject}» to ${String(to)})`);
    return;
  }
  client ??= new Resend(key);
  try {
    const { error } = await client.emails.send({ from: config.resend.fromAdmin, to, subject, html, text, replyTo });
    if (error) console.error(`Resend could not send «${subject}» to ${String(to)}:`, error);
  } catch (err) {
    console.error(`Resend could not send «${subject}» to ${String(to)}:`, err);
  }
}
