import type { MetadataRoute } from "next";
import { config } from "@/config";

// The landing, legal pages and blog are public; the reading app and the API are not for crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api"] },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
