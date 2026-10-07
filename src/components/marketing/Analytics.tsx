"use client";

import { useEffect } from "react";
import { config } from "@/config";

// PostHog on the public pages, ported from ShipeaRapido's components/Analytics.js.
// Without NEXT_PUBLIC_POSTHOG_KEY it does nothing: posthog-js is never downloaded and no request
// is made. Renders nothing either way.

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type CtaLocation = "hero" | "pricing" | "cta" | "header";

// Section ids / aria-labelledby values set by the R-012 components, so they stay untouched.
const SECTION_LOCATIONS: Record<string, CtaLocation> = {
  "hero-title": "hero",
  precios: "pricing",
  "cta-title": "cta",
};

const LOCATIONS = new Set<string>(["hero", "pricing", "cta", "header"]);

function ctaLocation(link: HTMLAnchorElement): CtaLocation | null {
  const explicit = link.closest<HTMLElement>("[data-cta]")?.dataset.cta;
  if (explicit && LOCATIONS.has(explicit)) return explicit as CtaLocation;
  if (link.closest("header")) return "header";
  const section = link.closest("section");
  if (!section) return null;
  return SECTION_LOCATIONS[section.id] ?? SECTION_LOCATIONS[section.getAttribute("aria-labelledby") ?? ""] ?? null;
}

// Pro links carry ?plan=pro; the free card's link is inside <article aria-labelledby="plan-free">.
function ctaPlan(link: HTMLAnchorElement): string | undefined {
  const fromUrl = new URL(link.href, window.location.href).searchParams.get("plan");
  if (fromUrl) return fromUrl;
  const card = link.closest("article")?.getAttribute("aria-labelledby");
  return card?.startsWith("plan-") ? card.slice("plan-".length) : undefined;
}

export function Analytics() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    let cancelled = false;
    let onClick: ((event: MouseEvent) => void) | null = null;

    // Dynamic import: posthog-js lives in its own chunk, only fetched when the key exists.
    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        persistence: "localStorage+cookie",
      });

      // One delegated listener instead of editing every CTA: any link into the app counts.
      onClick = (event) => {
        const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(`a[href^="${config.appPath}"]`);
        if (!link) return;
        const location = ctaLocation(link);
        if (!location) return;
        const plan = location === "pricing" ? ctaPlan(link) : undefined;
        posthog.capture("cta_clicked", plan ? { location, plan } : { location });
      };
      document.addEventListener("click", onClick);
    });

    return () => {
      cancelled = true;
      if (onClick) document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
