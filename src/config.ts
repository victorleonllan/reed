// Single source of product data (name, domain, plans, email senders), in the spirit of
// ShipeaRapido's config.js. Landing, pricing, billing and emails read from here.
// Limits are per user over a rolling 30-day window, keyed like UsageKind (see src/lib/usage.ts).
export const config = {
  appName: "Reed",
  tagline: "El amigo curioso que ya leyó el libro",
  appDescription:
    "Reed te lee en voz alta, te resume y responde tus preguntas mientras lees, para que cualquier libro quepa en tu día.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000",
  appPath: "/app",
  // Voices the reader can choose for read-aloud (POST /api/tts). Voice IDs are public in the
  // ElevenLabs voice library, so they live here rather than in env vars. Both are Latin American
  // Spanish speakers and usable through the API on the free plan.
  readerVoices: {
    // localProfile: the VoiceStudio voice profile that replaces it in pre-generated audio (R-029).
    antonio: { label: "Antonio", voiceId: "htFfPSZGJwjBv1CL0aMD", localProfile: "Reed Antonio" }, // soft and unhurried
    mauricio: { label: "Mauricio", voiceId: "94zOad0g7T7K4oa7zhDq", localProfile: "Reed Mauricio" }, // more standard
  },
  defaultReaderVoice: "antonio",
  localTts: {
    // VoiceStudio engine used by the audio machine (R-031). See VoiceStudio docs/engines.
    model: "omnivoice",
    language: "es",
    // Bump to regenerate every file (new engine, new voice profiles) without deleting the old ones.
    libraryVersion: "v1",
  },
  // Placeholder until Victor sets the real address (R-PENDIENTES).
  supportEmail: "hola@reed.app",
  resend: {
    fromNoReply: "Reed <noreply@reed.app>",
    fromAdmin: "Reed <hola@reed.app>",
  },
  // Prices in USD (R-034). `free` is not sold: it is an account without a paid plan (never paid
  // or canceled). `books` is how many own books a user can keep stored at once (counted on
  // `documents`, R-035); `audioBooks` sends their own books to the audio machine queue (R-036).
  plans: {
    free: {
      name: "Sin plan",
      priceMonthly: 0,
      priceYearly: 0,
      currency: "USD",
      books: 0,
      audioBooks: false,
      limits: { tts_chars: 0, upload: 0, agent_session: 0, ai_request: 0 },
    },
    basico: {
      name: "Reed Básico",
      priceMonthly: 1,
      priceYearly: 10,
      currency: "USD",
      stripePriceMonthly: process.env.STRIPE_PRICE_BASICO_MONTHLY ?? "",
      stripePriceYearly: process.env.STRIPE_PRICE_BASICO_YEARLY ?? "",
      books: 1,
      audioBooks: false,
      // tts_chars only counts with TTS_FALLBACK=elevenlabs (R-038).
      limits: { tts_chars: 0, upload: 2, agent_session: 10, ai_request: 30 },
      features: [
        "Lee y escucha los libros de Reed",
        "Guarda 1 libro tuyo",
        "30 preguntas o resúmenes al mes",
        "10 conversaciones conmigo al mes",
      ],
    },
    pro: {
      name: "Reed Pro",
      priceMonthly: 10,
      priceYearly: 100,
      currency: "USD",
      stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
      stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
      books: 3,
      audioBooks: true,
      limits: { tts_chars: 20_000, upload: 6, agent_session: 60, ai_request: 300 },
      features: [
        "Te leo tus propios libros con mi voz",
        "Guarda 3 libros tuyos",
        "300 preguntas o resúmenes al mes",
        "60 conversaciones conmigo al mes",
        "Sin apuro: cancelas cuando quieras",
      ],
    },
    biblioteca: {
      name: "Reed Biblioteca",
      priceMonthly: 25,
      priceYearly: 250,
      currency: "USD",
      stripePriceMonthly: process.env.STRIPE_PRICE_BIBLIOTECA_MONTHLY ?? "",
      stripePriceYearly: process.env.STRIPE_PRICE_BIBLIOTECA_YEARLY ?? "",
      books: 20,
      audioBooks: true,
      limits: { tts_chars: 50_000, upload: 40, agent_session: 200, ai_request: 1000 },
      features: [
        "Te leo tus propios libros con mi voz",
        "Guarda 20 libros tuyos",
        "1000 preguntas o resúmenes al mes",
        "200 conversaciones conmigo al mes",
        "Sin apuro: cancelas cuando quieras",
      ],
    },
  },
} as const;

export type ReaderVoice = keyof typeof config.readerVoices;
