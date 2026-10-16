import React, { useEffect, useRef, useState } from 'react';
import { ReaderModal } from '../reader/SummaryModal';
import { ReedCharacter } from '../reed/ReedCharacter';
import { Button } from '../ui/Button';
import {
  CHOOSE_PLAN_EVENT,
  PAID_PLANS,
  PLAN_NAMES,
  PLAN_PRICES,
  PLAN_SUMMARIES,
  PaidPlanId,
  getUsage,
  hasPaidPlan,
  openPortal,
  startCheckout,
} from '../../services/billing';

// A burst of 429s (or a limit hit again a minute later) must not keep popping the modal.
const REOPEN_AFTER_MS = 10 * 60 * 1000;

type Reason = 'limit' | 'choose';

/**
 * Opens on the `reed:limit` event that apiFetch fires on a 429, and on «Elegir plan» from the
 * profile. Without a paid plan it offers the three plans; with one, it points to the portal.
 */
export const UpgradeModal: React.FC = () => {
  const [reason, setReason] = useState<Reason | null>(null);
  const [message, setMessage] = useState('');
  // null while the plan loads or if it couldn't be read: then only the message and the close button.
  const [paid, setPaid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState<PaidPlanId | 'portal' | null>(null);
  const lastOpenedAt = useRef(0);

  useEffect(() => {
    const open = (next: Reason, text: string) => {
      setReason(next);
      setMessage(text);
      setPaid(null);
      setRedirecting(null);
      getUsage()
        .then(({ plan }) => setPaid(hasPaidPlan(plan)))
        .catch(() => setPaid(null));
    };
    const onLimit = (event: Event) => {
      const now = Date.now();
      if (now - lastOpenedAt.current < REOPEN_AFTER_MS) return;
      lastOpenedAt.current = now;
      open('limit', (event as CustomEvent<{ message?: string }>).detail?.message ?? '');
    };
    const onChoose = () => open('choose', '');
    window.addEventListener('reed:limit', onLimit);
    window.addEventListener(CHOOSE_PLAN_EVENT, onChoose);
    return () => {
      window.removeEventListener('reed:limit', onLimit);
      window.removeEventListener(CHOOSE_PLAN_EVENT, onChoose);
    };
  }, []);

  const close = () => setReason(null);

  const choose = async (plan: PaidPlanId) => {
    setRedirecting(plan);
    if (!(await startCheckout(plan, 'month'))) setRedirecting(null);
  };

  const manage = async () => {
    setRedirecting('portal');
    if (!(await openPortal())) setRedirecting(null);
  };

  return (
    <ReaderModal
      isOpen={reason !== null}
      onClose={close}
      eyebrow="Reed"
      title={reason === 'choose' ? 'Elige cómo seguimos leyendo.' : 'Leímos mucho juntos.'}
      closeLabel="Cerrar"
    >
      {reason === 'limit' && (
        <div className="flex flex-col items-center text-center">
          <ReedCharacter mode="sleeping" size="lg" animated />
          {message && <p className="text-sm text-ink-muted mt-4 max-w-sm">{message}</p>}
        </div>
      )}

      {paid === false && (
        <ul className="mt-6 space-y-3">
          {PAID_PLANS.map((plan) => (
            <li key={plan}>
              <button
                type="button"
                disabled={redirecting !== null}
                onClick={() => void choose(plan)}
                className={`w-full text-left bg-paper p-4 rounded-md border focus-ring transition-colors duration-states disabled:opacity-60 ${
                  plan === 'pro' ? 'border-reed' : 'border-line hover:border-line-strong'
                }`}
              >
                <span className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-sm font-bold text-ink">{PLAN_NAMES[plan]}</span>
                  <span className="text-sm text-ink-muted">
                    {redirecting === plan ? 'Abriendo el pago…' : PLAN_PRICES[plan].month}
                  </span>
                </span>
                <span className="block mt-1 text-sm text-ink-muted">{PLAN_SUMMARIES[plan]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {paid === true && (
        <p className="mt-6 text-sm text-ink text-center">
          Puedes cambiar de plan desde "Gestionar suscripción".
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-6 border-t border-line">
        <Button variant={paid === null ? 'primary' : 'quiet'} onClick={close}>
          Ahora no
        </Button>
        {paid === true && (
          <Button variant="primary" loading={redirecting === 'portal'} onClick={() => void manage()}>
            Gestionar suscripción
          </Button>
        )}
      </div>
    </ReaderModal>
  );
};
