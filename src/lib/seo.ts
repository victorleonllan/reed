import type { Metadata } from "next";
import { config } from "@/config";

type SEOTagsInput = {
  title?: string;
  description?: string;
  // Path from the site root ("/tos"); becomes the canonical URL and og:url.
  path?: string;
  keywords?: string[];
  // Extra fields merged last, for anything a page needs beyond the defaults.
  extra?: Metadata;
};

// Port of ShipeaRapido's libs/seo.js on top of Next's Metadata API. The Open Graph image comes
// from src/app/opengraph-image.tsx, which Next attaches to every page on its own.
export function getSEOTags({
  title,
  description = config.appDescription,
  path = "/",
  keywords,
  extra,
}: SEOTagsInput = {}): Metadata {
  const fullTitle = title ? `${title} · ${config.appName}` : `${config.appName} · ${config.tagline}`;
  const url = `${config.siteUrl}${path === "/" ? "" : path}`;

  return {
    title: fullTitle,
    description,
    keywords,
    applicationName: config.appName,
    metadataBase: new URL(config.siteUrl),
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: config.appName,
      locale: "es_MX",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    ...extra,
  };
}
