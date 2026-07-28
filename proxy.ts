import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { platformHostGuard, tenantMiddleware } from "@/lib/tenant/middleware";

/**
 * Next.js middleware entry point (renamed from `middleware.ts` → `proxy.ts` in
 * Next 16; the build labels it "Proxy (Middleware)").
 *
 * Two surfaces, never mixed:
 *
 *  1. PLATFORM surface (`/admin/**`, `/login`, `/forgot-password`,
 *     `/reset-password`, `/auth/**`) → belongs to the platform host only. On a
 *     tenant domain it redirects to the platform; otherwise updateSession()
 *     refreshes the Supabase session and gates protected routes.
 *
 *  2. PUBLIC surface (everything else the matcher allows) → tenantMiddleware():
 *     resolves the tenant from the request host and rewrites to `/s/<slug>`.
 *     No Supabase, so tenant sites render even if auth/DB is unconfigured.
 *
 * NOTE: `/api/**` is excluded by the matcher and is therefore not host-guarded;
 * those routes are individually protected (CRON_SECRET, Twilio signature,
 * requireUser).
 */
const PLATFORM_EXACT = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
]);
const PLATFORM_PREFIXES = ["/admin", "/platform", "/auth"];

function isPlatformPath(pathname: string): boolean {
  return (
    PLATFORM_EXACT.has(pathname) ||
    PLATFORM_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPlatformPath(pathname)) {
    const redirect = await platformHostGuard(request);
    return redirect ?? updateSession(request);
  }

  return tenantMiddleware(request);
}

export const config = {
  // Run on everything except Next internals, the API, and static files (any
  // path containing a dot). This covers `/`, `/s/**`, `/admin/**`, and `/login`;
  // proxy() branches by path above.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
