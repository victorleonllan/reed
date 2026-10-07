import { clerkClient } from "@clerk/nextjs/server";

export type PlanId = "free" | "pro";
export type PlanInfo = {
  plan: PlanId;
  status: "active" | "past_due" | "canceled" | "none";
  renewsAt: string | null; // ISO
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

const FREE: PlanInfo = { plan: "free", status: "none", renewsAt: null, stripeCustomerId: null, stripeSubscriptionId: null };
const CACHE_MS = 60_000;
// Every API request asks for the plan and Clerk rate-limits its API, so keep it in memory a bit.
const cache = new Map<string, { info: PlanInfo; at: number }>();
let warnedNoKey = false;

function hasClerkKey() {
  if (process.env.CLERK_SECRET_KEY) return true;
  if (!warnedNoKey) {
    console.warn("CLERK_SECRET_KEY is not set: every user is treated as the free plan.");
    warnedNoKey = true;
  }
  return false;
}

function parse(raw: unknown): PlanInfo {
  if (!raw || typeof raw !== "object") return { ...FREE };
  const r = raw as Partial<PlanInfo>;
  return {
    plan: r.plan === "pro" ? "pro" : "free",
    status: r.status === "active" || r.status === "past_due" || r.status === "canceled" ? r.status : "none",
    renewsAt: r.renewsAt ?? null,
    stripeCustomerId: r.stripeCustomerId ?? null,
    stripeSubscriptionId: r.stripeSubscriptionId ?? null,
  };
}

/** The user's plan, stored in Clerk publicMetadata.reed (writable only from the server). */
export async function getPlan(userId: string): Promise<PlanInfo> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.info;
  if (!hasClerkKey()) return { ...FREE };
  const user = await (await clerkClient()).users.getUser(userId);
  const info = parse(user.publicMetadata?.reed);
  cache.set(userId, { info, at: Date.now() });
  return info;
}

/** Merges `patch` into publicMetadata.reed and drops the cached entry. */
export async function setPlan(userId: string, patch: Partial<PlanInfo>): Promise<void> {
  cache.delete(userId);
  if (!hasClerkKey()) return;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = parse(user.publicMetadata?.reed);
  await client.users.updateUserMetadata(userId, { publicMetadata: { reed: { ...current, ...patch } } });
}

// past_due still counts: Stripe retries the charge for a few days and cutting access at once is hostile.
export function isPro(info: PlanInfo): boolean {
  return info.plan === "pro" && (info.status === "active" || info.status === "past_due");
}
