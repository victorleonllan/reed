import React, { useEffect, useState } from 'react';
import { useBackendAuth } from '../auth/ClerkAuthProvider';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import {
  BOOKS_LABEL,
  PLAN_EVENT,
  PLAN_NAMES,
  PLAN_PRICES,
  PlanSummary,
  USAGE_LABELS,
  UsageKind,
  UsageSummary,
  getUsage,
  hasPaidPlan,
  openPlanChooser,
  openPortal,
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

/** Plan, saved books, this month's usage and the way to choose or manage a plan. Hidden without a backend session (demo). */
export const PlanCard: React.FC = () => {
  const { backendSignedIn } = useBackendAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [failed, setFailed] = useState(false);
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
          redirecting={redirecting}
          onChoose={openPlanChooser}
          onManage={() => void go(openPortal)}
        />
      )}
    </section>
  );
};

const UsageBar: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => (
  <ProgressBar
    label={`${label} · ${formatNumber(used)} de ${formatNumber(limit)}`}
    percent={limit > 0 ? Math.round((used / limit) * 100) : 0}
  />
);

const PlanDetails: React.FC<{
  summary: UsageSummary;
  redirecting: boolean;
  onChoose: () => void;
  onManage: () => void;
}> = ({ summary, redirecting, onChoose, onManage }) => {
  const { plan, usage, books } = summary;
  const paid = hasPaidPlan(plan);
  const status = STATUS_LABELS[plan.status];
  const date = dateLine(plan);
  // Kinds with no allowance on this plan (e.g. read-aloud without TTS_FALLBACK) would only show «0 de 0».
  const kinds = (Object.keys(USAGE_LABELS) as UsageKind[]).filter((kind) => usage[kind] && usage[kind].limit > 0);

  return (
    <>
      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="font-serif text-2xl text-ink">{PLAN_NAMES[paid ? plan.plan : 'free']}</p>
        {status && <p className={`text-sm ${plan.status === 'past_due' ? 'text-danger' : 'text-ink-muted'}`}>{status}</p>}
      </div>
      {date && <p className="text-sm text-ink-muted mt-1">{date}</p>}

      {books && books.limit > 0 && (
        <div className="mt-6">
          <ProgressBar
            label={`${BOOKS_LABEL} · ${formatNumber(books.used)} de ${formatNumber(books.limit)} ${books.limit === 1 ? 'libro' : 'libros'}`}
            percent={Math.round((books.used / books.limit) * 100)}
          />
        </div>
      )}

      {kinds.length > 0 && (
        <>
          <p className="text-xs font-bold text-ink-muted mt-6 mb-3">Uso de este mes</p>
          <div className="space-y-4">
            {kinds.map((kind) => (
              <UsageBar key={kind} label={USAGE_LABELS[kind] ?? kind} used={usage[kind].used} limit={usage[kind].limit} />
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        {paid ? (
          <Button variant="outline" loading={redirecting} onClick={onManage}>Gestionar suscripción</Button>
        ) : (
          <>
            <Button variant="primary" onClick={onChoose}>Elegir plan</Button>
            <p className="text-xs text-ink-muted mt-2">Desde {PLAN_PRICES.basico.month}. Cancelas cuando quieras.</p>
          </>
        )}
      </div>
    </>
  );
};
