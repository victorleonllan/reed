import toast from 'react-hot-toast';
import { ApiError, apiFetch } from './api';
import { track } from '../lib/analytics';

// ---------- types (mirror GET /api/usage) ----------

export type UsageKind = 'tts_chars' | 'upload' | 'agent_session' | 'ai_request';
export type PlanStatus = 'active' | 'past_due' | 'canceled' | 'none';
export type BillingInterval = 'month' | 'year';

export interface PlanSummary {
  plan: 'free' | 'pro';
  status: PlanStatus;
  renewsAt: string | null; // ISO
}

export interface UsageSummary {
  usage: Record<UsageKind, { used: number; limit: number }>;
  plan: PlanSummary;
}

// Same rule as isPro() on the server: past_due keeps Pro while Stripe retries the charge.
export const isProPlan = (plan: PlanSummary) =>
  plan.plan === 'pro' && (plan.status === 'active' || plan.status === 'past_due');

// ---------- fixed copy, aligned with config.plans in src/config.ts ----------

export const PLAN_NAMES = { free: 'Gratis', pro: 'Reed Pro' } as const;

export const PRO_PRICES: Record<BillingInterval, string> = {
  month: '$99 MXN al mes',
  year: '$990 MXN al año',
};

export const PRO_FEATURES = [
  'Te leo en voz alta cuatro veces más cada día',
  'Sube hasta 30 libros o documentos al día',
  'Conversa conmigo por voz el doble de veces',
  'Pregúntame todo lo que quieras: hasta 500 respuestas diarias',
  'Sin apuro: cancelas cuando quieras',
];

export const USAGE_LABELS: Record<UsageKind, string> = {
  tts_chars: 'Lectura en voz alta',
  upload: 'Subidas',
  agent_session: 'Conversaciones por voz',
  ai_request: 'Respuestas de Reed',
};

// ---------- calls ----------

/** Fired with the fresh UsageSummary whenever someone reloads the plan, so a mounted PlanCard follows. */
export const PLAN_EVENT = 'reed:plan';

export async function getUsage(): Promise<UsageSummary> {
  const summary = await (await apiFetch('/api/usage')).json() as UsageSummary;
  window.dispatchEvent(new CustomEvent<UsageSummary>(PLAN_EVENT, { detail: summary }));
  return summary;
}

const PAYMENTS_OFF = 'Los pagos todavía no están activos.';
const REDIRECT_FAILED = 'No pude abrir la página de pago. Inténtalo de nuevo en unos segundos.';

/** POSTs to a Stripe route and goes to the returned URL. Returns false (after a toast) if it couldn't. */
async function goToStripe(path: string, body?: unknown): Promise<boolean> {
  try {
    const res = await apiFetch(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
    const { url } = await res.json() as { url: string };
    window.location.assign(url);
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) toast(PAYMENTS_OFF);
    // 409 «Ya tienes Reed Pro.» / 404 «Todavía no tienes una suscripción.»: plain notices, not errors.
    else if (err instanceof ApiError && (err.status === 409 || err.status === 404)) toast(err.message);
    else toast.error(err instanceof ApiError && err.status < 500 ? err.message : REDIRECT_FAILED);
    return false;
  }
}

export function startCheckout(interval: BillingInterval) {
  track('checkout_started', { interval });
  return goToStripe('/api/stripe/create-checkout', { interval });
}

export function openPortal() {
  track('portal_opened');
  return goToStripe('/api/stripe/create-portal');
}
