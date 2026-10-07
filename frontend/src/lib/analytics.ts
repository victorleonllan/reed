import type { PostHog } from 'posthog-js';

// Product funnel analytics (PostHog), same pattern as ShipeaRapido's libs/analytics.js.
// Without VITE_POSTHOG_KEY every function is a no-op: posthog-js isn't even downloaded and no
// request leaves the browser. Events never carry email, name or book text — only ids and enums.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

// Resolves to the initialized client; calls chained on it keep their order even before it loads.
let client: Promise<PostHog> | null = null;

export function initAnalytics() {
  if (!POSTHOG_KEY || client) return;
  client = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      persistence: 'localStorage+cookie',
      // Autocapture and recordings would send on-screen text (book pages, the user's name).
      autocapture: false,
      disable_session_recording: true,
    });
    return posthog;
  });
}

export function identify(userId: string) {
  void client?.then((posthog) => posthog.identify(userId));
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  void client?.then((posthog) => posthog.capture(event, props));
}

export function reset() {
  void client?.then((posthog) => posthog.reset());
}
