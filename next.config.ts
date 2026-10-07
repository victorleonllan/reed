import type { NextConfig } from "next";

// Baseline security headers for every response. A strict Content-Security-Policy is left out
// until the UI exists, since Clerk and ElevenLabs load scripts/frames/sockets from their domains.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // no embedding in other sites (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Mic is needed for the voice companion, only on our own origin; camera/location are never used.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // The frontend (Vite app in frontend/) is built into public/app/ (base "/app/") and served at /app.
    // It has no client-side routes, so only "/app" maps to its index.html; the landing page and
    // /api/* stay with Next.
    return { beforeFiles: [{ source: "/app", destination: "/app/index.html" }] };
  },
};

export default nextConfig;
