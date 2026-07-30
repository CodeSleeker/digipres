import { getTenantRouting } from "./edge-routing";
import { isPlatformHost, normalizeHost, resolveHostRoute } from "./resolve";
import { resolveHostFromDb } from "./db-fallback";
import { platformBaseUrl } from "./urls";

/**
 * Which tenant is an API request for?
 *
 * `/api/**` is excluded from the middleware matcher (see proxy.ts), so routes
 * under it never get the `/s/<slug>` rewrite and must resolve the tenant
 * themselves. This is that resolution, in the same order the middleware uses:
 * custom domain → platform subdomain → database fallback.
 *
 * The HOST WINS whenever it identifies a tenant. A caller-supplied slug is only
 * consulted when the request arrived on the platform's own host — local dev, or
 * the apex domain where tenants are served from /s/<slug> and the page has no
 * hostname of its own to speak for it.
 *
 * That fallback is a genuine (if small) hole: on those hosts, a caller can name
 * any tenant. It is bounded on purpose — a booking is a write of public,
 * self-supplied data, never a read, so the worst case is a nuisance booking
 * against the wrong shop, which an attacker could equally well create by
 * posting to that shop's own host. Rate limiting per business, not the slug's
 * provenance, is what actually contains that. Do NOT reuse this fallback for
 * anything that reads tenant data.
 */
export async function tenantSlugForRequest(
  request: Request,
  fallbackSlug?: string | null,
): Promise<string | null> {
  const host = normalizeHost(request.headers.get("host"));
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  const route = resolveHostRoute(host, rootDomain, await getTenantRouting());
  if (route) return route.slug;

  // A verified domain Edge Config hasn't picked up yet (or is down for).
  const fromDb = await resolveHostFromDb(host);
  if (fromDb) return fromDb.slug;

  // Only now may the request speak for itself, and only on our own hosts.
  if (isPlatformHost(host, rootDomain, platformBaseUrl())) {
    return fallbackSlug?.trim() || process.env.DEV_BUSINESS_SLUG?.trim() || null;
  }

  // A domain pointed at us that maps to no tenant.
  return null;
}
