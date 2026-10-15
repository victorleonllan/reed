import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 "proxy" (formerly middleware). Clerk reads the session here so `auth()` works in routes.
// Protection is per route: getUserId() returns 401 when signed out. The ElevenLabs webhook and
// agent-tool routes don't use Clerk; they check their own signature / secret.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path
    "/__clerk/:path*",
  ],
};
