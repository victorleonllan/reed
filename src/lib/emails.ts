import { config } from "@/config";

// Email templates in Reed's voice. Each returns { subject, html, text } for sendEmail (src/lib/resend.ts).
// Plain inline HTML (a 560px table) because email clients ignore stylesheets and web fonts.

export type EmailContent = { subject: string; html: string; text: string };

const PAPER = "#f3ecdf";
const INK = "#2b2620";
const ACCENT = "#2f5d46";
const SERIF = "Literata, Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const appUrl = () => `${config.siteUrl}${config.appPath}`;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const greeting = (name?: string | null) => (name?.trim() ? `Hola, ${name.trim()}:` : "Hola:");

const formatNumber = (value: number) => value.toLocaleString("es-MX");

/** Wraps blocks of HTML in Reed's paper layout, with the button and signature at the end. */
function layout({ title, body, button }: { title: string; body: string; button: { label: string; href: string } }) {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">
<tr><td style="padding:0 0 16px;font-family:${SERIF};font-size:26px;line-height:1.3;font-weight:bold;">${escapeHtml(title)}</td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding:24px 0;">
<a href="${button.href}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">${escapeHtml(button.label)}</a>
</td></tr>
<tr><td style="font-family:${SERIF};font-style:italic;">— Reed</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const paragraph = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;

const list = (items: string[]) =>
  `<ul style="margin:0 0 14px;padding-left:20px;">${items.map((item) => `<li style="margin:0 0 6px;">${item}</li>`).join("")}</ul>`;

// Same five modes and names as the app (frontend/src/components/reed/portraits.ts).
const MODES: { label: string; phrase: string }[] = [
  { label: "Lector", phrase: "te leo el libro en voz alta, a tu ritmo." },
  { label: "Compañero", phrase: "leo contigo y conversamos de lo que vas leyendo." },
  { label: "Profesor", phrase: "te explico lo difícil y te hago preguntas para que lo entiendas a fondo." },
  { label: "Bibliotecario", phrase: "te ayudo a ordenar tus libros y a volver a donde quedaste." },
  { label: "Dormido", phrase: "me quedo callado mientras lees por tu cuenta." },
];

/** Sent once, when the account is created (Clerk webhook, user.created). */
export function welcomeEmail({ name }: { name?: string | null }): EmailContent {
  const subject = "Ya estoy listo para leer contigo";
  const intro = `Soy Reed, el amigo curioso que ya leyó el libro. Te leo en voz alta, te resumo y respondo tus preguntas mientras lees, para que cualquier libro quepa en tu día.`;
  const modesIntro = "Tengo cinco modos, y cambias de uno a otro cuando quieras:";
  const outro = "Sube un libro o un documento y empezamos por donde tú quieras.";

  const html = layout({
    title: subject,
    body: [
      paragraph(escapeHtml(greeting(name))),
      paragraph(escapeHtml(intro)),
      paragraph(escapeHtml(modesIntro)),
      list(MODES.map(({ label, phrase }) => `<strong>${label}:</strong> ${escapeHtml(phrase)}`)),
      paragraph(escapeHtml(outro)),
    ].join(""),
    button: { label: "Abrir mi biblioteca", href: appUrl() },
  });

  const text = [
    greeting(name),
    "",
    intro,
    "",
    modesIntro,
    ...MODES.map(({ label, phrase }) => `- ${label}: ${phrase}`),
    "",
    outro,
    "",
    `Abrir mi biblioteca: ${appUrl()}`,
    "",
    "— Reed",
  ].join("\n");

  return { subject, html, text };
}

/** Sent when a Reed Pro subscription starts (Stripe webhook → onProActivated). */
export function proActivatedEmail({ name }: { name?: string | null }): EmailContent {
  const subject = "Reed Pro está activo";
  const { limits } = config.plans.pro;
  const intro = "Gracias por quedarte a leer conmigo. Desde ahora, cada día:";
  // Built from config.plans.pro.limits so the email follows any change to the plan.
  const changes = [
    `te leo en voz alta hasta ${formatNumber(limits.tts_chars)} caracteres;`,
    `subes hasta ${formatNumber(limits.upload)} libros o documentos;`,
    `conversamos hasta ${formatNumber(limits.agent_session)} veces;`,
    `me haces hasta ${formatNumber(limits.ai_request)} preguntas.`,
  ];
  const cancel = "Si algún día quieres cancelar, lo haces desde tu perfil, cuando quieras. Sin trámites.";

  const html = layout({
    title: subject,
    body: [
      paragraph(escapeHtml(greeting(name))),
      paragraph(escapeHtml(intro)),
      list(changes.map(escapeHtml)),
      paragraph(escapeHtml(cancel)),
    ].join(""),
    button: { label: "Seguir leyendo", href: appUrl() },
  });

  const text = [
    greeting(name),
    "",
    intro,
    ...changes.map((line) => `- ${line}`),
    "",
    cancel,
    "",
    `Seguir leyendo: ${appUrl()}`,
    "",
    "— Reed",
  ].join("\n");

  return { subject, html, text };
}
