import React, { useEffect, useState } from 'react';
import { useBackendAuth } from '../auth/ClerkAuthProvider';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import {
  BillingInterval,
  PLAN_EVENT,
  PLAN_NAMES,
  PRO_PRICES,
  PlanSummary,
  USAGE_LABELS,
  UsageKind,
  UsageSummary,
  getUsage,
  isProPlan,
  openPortal,
  startCheckout,
} from '../../services/billing';

const STATUS_LABELS: Record<PlanSummary['status'], string | null> = {
  active: 'Activo',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
  none: null,
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const formatNumber = (value: number) => value.toLocaleString('es-MX');

function dateLine(plan: PlanSummary): string | null {
  if (!plan.renewsAt) return null;
  if (plan.status === 'active') return `Se renueva el ${formatDate(plan.renewsAt)}.`;
  if (plan.status === 'canceled') return `Termina el ${formatDate(plan.renewsAt)}.`;
  return null;
}

/** Plan, today's usage and the way to pay or manage Reed Pro. Hidden without a backend session (demo). */
export const PlanCard: React.FC = () => {
  const { backendSignedIn } = useBackendAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [interval, setBillingInterval] = useState<BillingInterval>('month');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!backendSignedIn) return;
    let cancelled = false;
    // CheckoutReturn and UpgradeModal reload the plan too; follow their results.
    const onPlan = (event: Event) => {
      if (!cancelled) setSummary((event as CustomEvent<UsageSummary>).detail);
    };
    window.addEventListener(PLAN_EVENT, onPlan);
    getUsage().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      window.removeEventListener(PLAN_EVENT, onPlan);
    };
  }, [backendSignedIn]);

  if (!backendSignedIn) return null;

  const go = async (action: () => Promise<boolean>) => {
    setRedirecting(true);
    if (!(await action())) setRedirecting(false);
  };

  return (
    <section className="py-8 border-b border-line">
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4">Tu plan</h2>

      {!summary ? (
        <p className="text-sm text-ink-muted">{failed ? 'No pude cargar tu plan. Recarga la página.' : 'Cargando tu plan…'}</p>
      ) : (
        <PlanDetails
          summary={summary}
          interval={interval}
          onInterval={setBillingInterval}
          redirecting={redirecting}
          onUpgrade={() => void go(() => startCheckout(interval))}
          onManage={() => void go(openPortal)}
        />
      )}
    </section>
  );
};

const PlanDetails: React.FC<{
  summary: UsageSummary;
  interval: BillingInterval;
  onInterval: (interval: BillingInterval) => void;
  redirecting: boolean;
  onUpgrade: () => void;
  onManage: () => void;
}> = ({ summary, interval, onInterval, redirecting, onUpgrade, onManage }) => {
  const { plan, usage } = summary;
  const pro = isProPlan(plan);
  const status = STATUS_LABELS[plan.status];
  const date = dateLine(plan);

  return (
    <>
      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="font-serif text-2xl text-ink">{pro ? PLAN_NAMES.pro : PLAN_NAMES.free}</p>
        {status && <p className={`text-sm ${plan.status === 'past_due' ? 'text-danger' : 'text-ink-muted'}`}>{status}</p>}
      </div>
      {date && <p className="text-sm text-ink-muted mt-1">{date}</p>}

      <p className="text-xs font-bold text-ink-muted mt-6 mb-3">Uso de hoy</p>
      <div className="space-y-4">
        {(Object.keys(USAGE_LABELS) as UsageKind[]).filter((kind) => usage[kind]).map((kind) => {
          const { used, limit } = usage[kind];
          return (
            <ProgressBar
              key={kind}
              label={`${USAGE_LABELS[kind]} · ${formatNumber(used)} de ${formatNumber(limit)}`}
              percent={limit > 0 ? Math.round((used / limit) * 100) : 0}
            />
          );
        })}
      </div>

      <div className="mt-6">
        {pro ? (
          <Button variant="outline" loading={redirecting} onClick={onManage}>Administrar suscripción</Button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div role="radiogroup" aria-label="Forma de pago" className="inline-flex rounded-md border border-line p-0.5 self-start">
              {(['month', 'year'] as BillingInterval[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={interval === option}
                  onClick={() => onInterval(option)}
                  className={`px-3 py-1.5 text-[13px] rounded-sm font-sans focus-ring transition-colors duration-states ${
                    interval === option ? 'bg-paper-sunk text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {option === 'month' ? 'Mensual' : 'Anual'}
                </button>
              ))}
            </div>
            <Button variant="primary" loading={redirecting} onClick={onUpgrade}>Mejorar a Reed Pro</Button>
          </div>
        )}
        {!pro && <p className="text-xs text-ink-muted mt-2">{PRO_PRICES[interval]}. Cancelas cuando quieras.</p>}
      </div>
    </>
  );
};
