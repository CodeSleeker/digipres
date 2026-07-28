import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths that require an authenticated user. */
const PROTECTED_PREFIXES = ["/admin", "/platform"];
const LOGIN_PATH = "/login";

/**
 * Runs on every matched request (see middleware.ts).
 *
 * Responsibilities:
 *  1. Refresh the Supabase session and keep the auth cookies in sync between the
 *     request and the response (this is what makes sessions persist across
 *     navigations and server renders).
 *  2. Gate protected routes: send unauthenticated users hitting /admin or
 *     /platform to /login,
 *     and send already-authenticated users away from /login.
 *
 * `supabase.auth.getUser()` MUST be called here — it validates the token with
 * Supabase and triggers the cookie refresh. It is wrapped in try/catch so a
 * missing/misconfigured Supabase project degrades to "unauthenticated" instead
 * of throwing on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Unauthenticated → block protected routes.
  if (!user && isProtected) {
    return redirectTo(request, LOGIN_PATH, supabaseResponse, {
      redirectedFrom: pathname,
    });
  }

  // Authenticated → no reason to see the login page.
  if (user && pathname === LOGIN_PATH) {
    return redirectTo(request, "/admin", supabaseResponse);
  }

  return supabaseResponse;
}

/**
 * Build a redirect response while preserving any refreshed auth cookies that
 * were set on `base` (otherwise a redirect would drop the new session cookies).
 */
function redirectTo(
  request: NextRequest,
  pathname: string,
  base: NextResponse,
  params?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const response = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
