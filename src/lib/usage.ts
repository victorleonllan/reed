import { and, eq, gt, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { UsageKind } from "@/db/schema";
import { config } from "@/config";
import { activePlan, getPlan, type PlanId } from "./plan";

const { documents, usageEvents } = schema;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Rolling 30-day window. The global caps apply to every plan, paid ones included: they protect the
// shared ElevenLabs quota (131k chars/month on the Creator plan) however many users are paying.
// Override any of them with the LIMIT_*_GLOBAL env vars.
function limit(envName: string, fallback: number) {
  const value = Number(process.env[envName]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Per-user limits come only from config.plans[plan].limits (R-035); global caps are the same for everyone.
export function usageLimits(plan: PlanId): Record<UsageKind, { perUser: number; global: number }> {
  const p = config.plans[plan].limits;
  return {
    tts_chars: { perUser: p.tts_chars, global: limit("LIMIT_TTS_CHARS_GLOBAL", 131_000) },
    upload: { perUser: p.upload, global: limit("LIMIT_UPLOADS_GLOBAL", 2000) },
    agent_session: { perUser: p.agent_session, global: limit("LIMIT_SESSIONS_GLOBAL", 5000) },
    ai_request: { perUser: p.ai_request, global: limit("LIMIT_AI_GLOBAL", 30_000) },
  };
}

const LABELS: Record<UsageKind, string> = {
  tts_chars: "lectura en voz alta",
  upload: "subidas",
  agent_session: "conversaciones con Reed",
  ai_request: "respuestas de Reed",
};

function userLimitMessage(label: string, plan: PlanId) {
  switch (plan) {
    case "free":
      return `Para ${label} necesitas un plan. Reed Básico cuesta USD 1 al mes.`;
    case "basico":
      return `Llegaste al límite de ${label} de este mes. Con Reed Pro tienes más.`;
    case "pro":
      return `Llegaste al límite de ${label} de este mes. Con Reed Biblioteca tienes más.`;
    case "biblioteca":
      return `Llegaste al límite de ${label} de este mes.`;
  }
}

export class UsageLimitError extends Error {
  constructor(
    readonly kind: UsageKind,
    readonly scope: "user" | "global",
    readonly plan: PlanId,
  ) {
    super(
      scope === "global"
        ? `Este mes se agotó el presupuesto de ${LABELS[kind]} de Reed. Vuelvo a estar disponible pronto.`
        : userLimitMessage(LABELS[kind], plan),
    );
  }
}

/** The user already keeps as many own books as their plan allows (R-035). */
export class BookSlotsFullError extends Error {
  constructor(
    readonly limit: number,
    readonly plan: PlanId,
  ) {
    super(
      limit === 0
        ? "Para guardar tus libros necesitas un plan. Reed Básico cuesta USD 1 al mes."
        : `Ya tienes ${limit} libros guardados, el máximo de tu plan. Borra uno para subir otro.`,
    );
  }
}

async function usedSince(kind: UsageKind, since: Date, userId?: string) {
  const [row] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${usageEvents.amount}), 0)::int` })
    .from(usageEvents)
    .where(and(eq(usageEvents.kind, kind), gt(usageEvents.createdAt, since), userId ? eq(usageEvents.userId, userId) : undefined));
  return row.total;
}

/** How many own books the user keeps stored: their documents that didn't fail. */
export async function countSavedBooks(userId: string) {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(eq(documents.userId, userId), ne(documents.status, "failed")));
  return row.total;
}

/**
 * Throws UsageLimitError if `amount` more of `kind` would exceed the user's or the global 30-day
 * limit; otherwise records it. Call right before the paid request. Concurrent requests can
 * overshoot slightly (check and insert aren't atomic), which is fine for cost protection.
 */
export async function consumeUsage(userId: string, kind: UsageKind, amount = 1) {
  const since = new Date(Date.now() - WINDOW_MS);
  const plan = activePlan(await getPlan(userId));
  const limits = usageLimits(plan)[kind];
  const [user, global] = await Promise.all([usedSince(kind, since, userId), usedSince(kind, since)]);
  if (user + amount > limits.perUser) throw new UsageLimitError(kind, "user", plan);
  if (global + amount > limits.global) throw new UsageLimitError(kind, "global", plan);
  await getDb().insert(usageEvents).values({ userId, kind, amount });
}

/** Usage in the last 30 days vs. limits, saved books vs. slots, and the user's plan, for GET /api/usage. */
export async function usageSummary(userId: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const info = await getPlan(userId);
  const plan = activePlan(info);
  const limits = usageLimits(plan);
  const kinds = Object.keys(limits) as UsageKind[];
  const [used, savedBooks] = await Promise.all([
    Promise.all(kinds.map((kind) => usedSince(kind, since, userId))),
    countSavedBooks(userId),
  ]);
  return {
    plan: info,
    activePlan: plan,
    usage: Object.fromEntries(kinds.map((kind, i) => [kind, { used: used[i], limit: limits[kind].perUser }])),
    books: { used: savedBooks, limit: config.plans[plan].books },
  };
}
