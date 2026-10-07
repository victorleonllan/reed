import type { MetadataRoute } from "next";
import { config } from "@/config";

// Public pages only; /app and /api stay out (see robots.ts). /blog is listed ahead of R-018.
const routes = ["/", "/tos", "/privacy-policy", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${config.siteUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/blog" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
