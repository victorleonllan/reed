import React, { useEffect, useRef, useState } from 'react';
import { ReaderModal } from '../reader/SummaryModal';
import { ReedCharacter } from '../reed/ReedCharacter';
import { Button } from '../ui/Button';
import { PRO_FEATURES, PRO_PRICES, getUsage, isProPlan, startCheckout } from '../../services/billing';

// A burst of 429s (or a limit hit again a minute later) must not keep popping the modal.
const REOPEN_AFTER_MS = 10 * 60 * 1000;

/** Opens on the `reed:limit` event that apiFetch fires on a 429. Free users see what Reed Pro adds. */
export const UpgradeModal: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  // null while the plan loads or if it couldn't be read: then only the message and «Seguir mañana».
  const [isFree, setIsFree] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const lastOpenedAt = useRef(0);

  useEffect(() => {
    const onLimit = (event: Event) => {
      const now = Date.now();
      if (now - lastOpenedAt.current < REOPEN_AFTER_MS) return;
      lastOpenedAt.current = now;
      setMessage((event as CustomEvent<{ message?: string }>).detail?.message ?? '');
      setIsFree(null);
      getUsage()
        .then(({ plan }) => setIsFree(!isProPlan(plan)))
        .catch(() => setIsFree(null));
    };
    window.addEventListener('reed:limit', onLimit);
    return () => window.removeEventListener('reed:limit', onLimit);
  }, []);

  const close = () => setMessage(null);

  const tryPro = async () => {
    setRedirecting(true);
    if (!(await startCheckout('month'))) setRedirecting(false);
  };

  return (
    <ReaderModal
      isOpen={message !== null}
      onClose={close}
      eyebrow="Reed"
      title="Hoy leímos mucho juntos."
      closeLabel="Cerrar"
    >
      <div className="flex flex-col items-center text-center">
        <ReedCharacter mode="sleeping" size="lg" animated />
        {message && <p className="text-sm text-ink-muted mt-4 max-w-sm">{message}</p>}
      </div>

      {isFree && (
        <div className="mt-6 bg-paper p-5 rounded-md border border-line">
          <p className="text-sm font-bold text-ink">Con Reed Pro · {PRO_PRICES.month}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-[7px] h-[3px] w-3 shrink-0 rounded-pill bg-reed" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-6 border-t border-line">
        <Button variant={isFree ? 'quiet' : 'primary'} onClick={close}>
          Seguir mañana
        </Button>
        {isFree && (
          <Button variant="primary" loading={redirecting} onClick={() => void tryPro()}>
            Probar Reed Pro
          </Button>
        )}
      </div>
    </ReaderModal>
  );
};
