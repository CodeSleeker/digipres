import { NextResponse, type NextRequest } from "next/server";
import { getTenantRouting } from "./edge-routing";
import {
  isPlatformHost,
  normalizeHost,
  platformRedirectUrl,
  resolveHostRoute,
} from "./resolve";
import { platformBaseUrl } from "./urls";
import { resolveHostFromDb } from "./db-fallback";

/** A domain reached us but maps to no tenant (e.g. DNS set before verifying). */
function unknownHostResponse(): NextResponse {
  return new NextResponse(
    "<!doctype html><meta charset=utf-8><title>Site not connected</title>" +
      "<p>This domain isn’t connected to a website yet.</p>",
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/**
 * Keep platform-only surfaces (dashboard, auth) off customer domains.
 *
 * A tenant's domain should serve their website and nothing else — serving the
 * platform login there is unprofessional, a phishing surface, and scopes auth
 * cookies to a domain the platform doesn't own. Returns a redirect to the
 * platform host, or null to let the request continue.
 *
 * Uses 307 (temporary) rather than 301 on purpose: these paths are noindex, so
 * there's no SEO gain from a permanent redirect, and a permanent one would be
 * cached by browsers if the admin host ever moves.
 */
export async function platformHostGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const host = normalizeHost(request.headers.get("host"));
  const route = resolveHostRoute(
    host,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    await getTenantRouting(),
  );

  const { pathname, search } = request.nextUrl;
  const target = platformRedirectUrl(
    route,
    platformBaseUrl(),
    pathname,
    search,
  );

  return target ? NextResponse.redirect(target, 307) : null;
}

/**
 * Tenant routing for the PUBLIC surface. Never touches Supabase, so the public
 * website keeps rendering even when auth/DB is unconfigured.
 *
 * Resolution (see resolveHostRoute):
 *   custom domain → platform subdomain → passthrough (apex / localhost)
 *
 * Outcomes:
 *   - canonical host  → REWRITE to the internal /s/<slug> (URL stays the domain)
 *   - alias host      → 301 to the canonical host (www→apex, subdomain→domain)
 *   - direct /s/<slug> → 301 to the canonical host, so the internal route is
 *     never a public URL once a domain exists
 *   - anything else   → passthrough (dev apex uses DEV_BUSINESS_SLUG)
 */
export async function tenantMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const host = normalizeHost(request.headers.get("host"));
  const routing = await getTenantRouting();

  // Rewrites don't re-enter middleware, so a /s/ path here is always an
  // external request — safe to redirect without breaking internal rendering.
  const internal = /^\/s\/([^/]+)(.*)$/.exec(pathname);
  if (internal) {
    const primary = routing?.primary?.[internal[1]!];
    if (primary && primary !== host) {
      const rest = internal[2] || "/";
      return NextResponse.redirect(`https://${primary}${rest}${search}`, 301);
    }
    return NextResponse.next();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  const platformBase = platformBaseUrl();

  let route = resolveHostRoute(host, rootDomain, routing);

  if (!route) {
    // Nothing configured (local dev / single-host deploy) → behave as before.
    if (!rootDomain && !platformBase) return NextResponse.next();

    // The platform's own pages.
    if (isPlatformHost(host, rootDomain, platformBase)) {
      return NextResponse.next();
    }

    // A real domain that Edge Config didn't know about — it may be newly
    // verified or Edge Config may be down, so ask the database before giving up.
    route = await resolveHostFromDb(host);

    // Still nothing: this domain maps to no tenant. 404 rather than silently
    // serving the default template on someone's domain.
    if (!route) return unknownHostResponse();
  }

  if (route.primaryHostname && route.primaryHostname !== route.hostname) {
    return NextResponse.redirect(
      `https://${route.primaryHostname}${pathname}${search}`,
      301,
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = `/s/${route.slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}
