// Single source of product data (name, domain, plans, email senders), in the spirit of
// ShipeaRapido's config.js. Landing, pricing, billing and emails read from here.
// Limits are per user over a rolling 24h window, keyed like UsageKind (see src/lib/usage.ts).
export const config = {
  appName: "Reed",
  tagline: "El amigo curioso que ya leyó el libro",
  appDescription:
    "Reed te lee en voz alta, te resume y responde tus preguntas mientras lees, para que cualquier libro quepa en tu día.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000",
  appPath: "/app",
  // Placeholder until Victor sets the real address (R-PENDIENTES).
  supportEmail: "hola@reed.app",
  resend: {
    fromNoReply: "Reed <noreply@reed.app>",
    fromAdmin: "Reed <hola@reed.app>",
  },
  plans: {
    free: {
      name: "Gratis",
      priceMonthly: 0,
      priceYearly: 0,
      currency: "MXN",
      // Same as the current defaults in src/lib/usage.ts, so the free plan doesn't change.
      limits: { tts_chars: 5_000, upload: 10, agent_session: 30, ai_request: 100 },
    },
    pro: {
      name: "Reed Pro",
      priceMonthly: 99,
      priceYearly: 990,
      currency: "MXN",
      stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
      stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
      // Default pricing and limits; to be tuned against the real ElevenLabs cost (R-PENDIENTES).
      limits: { tts_chars: 20_000, upload: 30, agent_session: 60, ai_request: 500 },
      features: [
        "Te leo en voz alta cuatro veces más cada día",
        "Sube hasta 30 libros o documentos al día",
        "Conversa conmigo por voz el doble de veces",
        "Pregúntame todo lo que quieras: hasta 500 respuestas diarias",
        "Sin apuro: cancelas cuando quieras",
      ],
    },
  },
} as const;
