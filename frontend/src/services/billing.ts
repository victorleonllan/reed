import toast from 'react-hot-toast';
import { ApiError, apiFetch } from './api';
import { track } from '../lib/analytics';

// ---------- types (mirror GET /api/usage) ----------

export type UsageKind = 'tts_chars' | 'upload' | 'agent_session' | 'ai_request';
export type PlanStatus = 'active' | 'past_due' | 'canceled' | 'none';
export type BillingInterval = 'month' | 'year';

export type PlanId = 'free' | 'basico' | 'pro' | 'biblioteca';
export type PaidPlanId = Exclude<PlanId, 'free'>;

export interface PlanSummary {
  plan: PlanId;
  status: PlanStatus;
  renewsAt: string | null; // ISO
}

export interface UsageSummary {
  usage: Record<UsageKind, { used: number; limit: number }>;
  // Own books kept stored vs. the plan's slots (R-035).
  books: { used: number; limit: number };
  plan: PlanSummary;
}

// Same rule as activePlan() on the server: past_due keeps the plan while Stripe retries the charge.
export const hasPaidPlan = (plan: PlanSummary) =>
  plan.plan !== 'free' && (plan.status === 'active' || plan.status === 'past_due');

// ---------- fixed copy, aligned with config.plans in src/config.ts ----------

export const PAID_PLANS: readonly PaidPlanId[] = ['basico', 'pro', 'biblioteca'];

export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Sin plan',
  basico: 'Reed Básico',
  pro: 'Reed Pro',
  biblioteca: 'Reed Biblioteca',
};

export const PLAN_PRICES: Record<PaidPlanId, Record<BillingInterval, string>> = {
  basico: { month: 'USD 1 / mes', year: 'USD 10 / año' },
  pro: { month: 'USD 10 / mes', year: 'USD 100 / año' },
  biblioteca: { month: 'USD 25 / mes', year: 'USD 250 / año' },
};

export const PLAN_FEATURES: Record<PaidPlanId, readonly string[]> = {
  basico: [
    'Lee y escucha los libros de Reed',
    'Guarda 1 libro tuyo',
    '30 preguntas o resúmenes al mes',
    '10 conversaciones conmigo al mes',
  ],
  pro: [
    'Te leo tus propios libros con mi voz',
    'Guarda 3 libros tuyos',
    '300 preguntas o resúmenes al mes',
    '60 conversaciones conmigo al mes',
    'Sin apuro: cancelas cuando quieras',
  ],
  biblioteca: [
    'Te leo tus propios libros con mi voz',
    'Guarda 20 libros tuyos',
    '1000 preguntas o resúmenes al mes',
    '200 conversaciones conmigo al mes',
    'Sin apuro: cancelas cuando quieras',
  ],
};

// One line per plan for the upgrade modal, taken from PLAN_FEATURES.
export const PLAN_SUMMARIES: Record<PaidPlanId, string> = {
  basico: 'Guarda 1 libro tuyo y pregúntame 30 veces al mes.',
  pro: 'Te leo tus propios libros con mi voz. Guarda 3.',
  biblioteca: 'Te leo tus propios libros con mi voz. Guarda 20.',
};

// agent_session stays in UsageKind (the server still returns it) but is not shown: voice chat is gone.
export const USAGE_LABELS: Partial<Record<UsageKind, string>> = {
  tts_chars: 'Lectura en voz alta al mes',
  upload: 'Subidas al mes',
  ai_request: 'Respuestas de Reed al mes',
};

export const BOOKS_LABEL = 'Libros guardados';

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
    // 409 «Ya tienes un plan.» / 404 «Todavía no tienes una suscripción.»: plain notices, not errors.
    else if (err instanceof ApiError && (err.status === 409 || err.status === 404)) toast(err.message);
    else toast.error(err instanceof ApiError && err.status < 500 ? err.message : REDIRECT_FAILED);
    return false;
  }
}

export function startCheckout(plan: PaidPlanId, interval: BillingInterval) {
  track('checkout_started', { plan, interval });
  return goToStripe('/api/stripe/create-checkout', { plan, interval });
}

/** Fired by «Elegir plan» so UpgradeModal (mounted in App) opens with the plan options. */
export const CHOOSE_PLAN_EVENT = 'reed:choose-plan';

export function openPlanChooser() {
  window.dispatchEvent(new Event(CHOOSE_PLAN_EVENT));
}

export function openPortal() {
  track('portal_opened');
  return goToStripe('/api/stripe/create-portal');
}
