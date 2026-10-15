import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { UsageKind } from "@/db/schema";
import { config } from "@/config";
import { getPlan, isPro, type PlanId } from "./plan";

const { usageEvents } = schema;
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Rolling 24h limits. The global caps protect the shared ElevenLabs quota (131k chars/month on
// the Creator plan) no matter how many users sign up. Override any of them with env vars.
function limit(envName: string, fallback: number) {
  const value = Number(process.env[envName]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Per-user limits come from config.plans[plan]; the LIMIT_*_PER_USER env vars still override the
// free plan only (compatibility with the current deploy). Global caps are the same for everyone.
export function usageLimits(plan: PlanId): Record<UsageKind, { perUser: number; global: number }> {
  const p = config.plans[plan].limits;
  const perUser = (envName: string, fallback: number) => (plan === "free" ? limit(envName, fallback) : fallback);
  return {
    tts_chars: { perUser: perUser("LIMIT_TTS_CHARS_PER_USER", p.tts_chars), global: limit("LIMIT_TTS_CHARS_GLOBAL", 20_000) },
    upload: { perUser: perUser("LIMIT_UPLOADS_PER_USER", p.upload), global: limit("LIMIT_UPLOADS_GLOBAL", 100) },
    agent_session: { perUser: perUser("LIMIT_SESSIONS_PER_USER", p.agent_session), global: limit("LIMIT_SESSIONS_GLOBAL", 300) },
    ai_request: { perUser: perUser("LIMIT_AI_PER_USER", p.ai_request), global: limit("LIMIT_AI_GLOBAL", 1000) },
  };
}

const LABELS: Record<UsageKind, string> = {
  tts_chars: "lectura en voz alta",
  upload: "subidas",
  agent_session: "conversaciones con Reed",
  ai_request: "respuestas de Reed",
};

export class UsageLimitError extends Error {
  constructor(
    readonly kind: UsageKind,
    readonly scope: "user" | "global",
    readonly plan: PlanId,
  ) {
    super(
      scope === "global"
        ? `Por hoy se agotó el presupuesto de ${LABELS[kind]} de Reed. Vuelve mañana y seguimos.`
        : plan === "free"
          ? `Llegaste al límite diario de ${LABELS[kind]} del plan gratis. Con Reed Pro tienes más.`
          : `Llegaste al límite diario de ${LABELS[kind]}. Vuelve mañana y seguimos.`,
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

/**
 * Throws UsageLimitError if `amount` more of `kind` would exceed the user's or the global 24h limit;
 * otherwise records it. Call right before the paid ElevenLabs request. Concurrent requests can
 * overshoot slightly (check and insert aren't atomic), which is fine for cost protection.
 */
export async function consumeUsage(userId: string, kind: UsageKind, amount = 1) {
  const since = new Date(Date.now() - WINDOW_MS);
  const info = await getPlan(userId);
  const pro = isPro(info);
  const plan: PlanId = pro ? "pro" : "free";
  const limits = usageLimits(plan)[kind];
  // Pro users skip the global cap: it protects the shared ElevenLabs quota from free usage, and
  // paying users fund their own.
  const [user, global] = await Promise.all([usedSince(kind, since, userId), pro ? 0 : usedSince(kind, since)]);
  if (user + amount > limits.perUser) throw new UsageLimitError(kind, "user", plan);
  if (!pro && global + amount > limits.global) throw new UsageLimitError(kind, "global", plan);
  await getDb().insert(usageEvents).values({ userId, kind, amount });
}

/** Usage in the last 24h vs. limits plus the user's plan, for GET /api/usage. */
export async function usageSummary(userId: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const info = await getPlan(userId);
  const plan: PlanId = isPro(info) ? "pro" : "free";
  const limits = usageLimits(plan);
  const kinds = Object.keys(limits) as UsageKind[];
  const used = await Promise.all(kinds.map((kind) => usedSince(kind, since, userId)));
  return {
    plan: info,
    usage: Object.fromEntries(kinds.map((kind, i) => [kind, { used: used[i], limit: limits[kind].perUser }])),
  };
}
