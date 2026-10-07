import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useBackendAuth } from '../auth/ClerkAuthProvider';
import { clerkEnabled } from '../../lib/clerkEnv';
import { getUsage, isProPlan, startCheckout } from '../../services/billing';

const QUERY_KEYS = ['checkout', 'plan', 'interval'];
const RETRIES = 3;
const RETRY_MS = 2000;

/** Drops the billing params from the URL without reloading or adding a history entry. */
function clearQuery() {
  const url = new URL(window.location.href);
  QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// The Stripe webhook can land a few seconds after the redirect: ask again until the plan is Pro.
async function refreshUntilPro() {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    await wait(RETRY_MS);
    try {
      if (isProPlan((await getUsage()).plan)) return;
    } catch {
      // keep trying; the profile reloads the plan on its own anyway
    }
  }
}

/**
 * Reads the URL once on load: back from Stripe (?checkout=ok|cancelado) or coming from the Pro
 * button on the landing (?plan=pro&interval=month|year). Renders nothing.
 */
export const CheckoutReturn: React.FC = () => {
  const { backendSignedIn } = useBackendAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const wantsPro = params.get('plan') === 'pro';
    if (!checkout && !wantsPro) {
      handled.current = true;
      return;
    }
    // With Clerk, wait until requests carry the token; in demo mode there's no session to wait for.
    if (clerkEnabled && !backendSignedIn) return;
    handled.current = true;
    clearQuery();

    if (checkout === 'ok') {
      toast.success('Listo: ya tienes Reed Pro.');
      void refreshUntilPro();
    } else if (checkout === 'cancelado') {
      toast('No se hizo ningún cobro.');
    }

    if (wantsPro) {
      if (backendSignedIn) void startCheckout(params.get('interval') === 'year' ? 'year' : 'month');
      else toast('Los pagos todavía no están activos.');
    }
  }, [backendSignedIn]);

  return null;
};
