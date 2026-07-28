/**
 * Tenant resolution helpers (pure, no I/O — safe for the edge middleware).
 *
 * A tenant is identified by its business `slug`. In production the slug is
 * carried by a subdomain (`<slug>.example.com`); the middleware rewrites those
 * requests to the internal `/s/<slug>` route. Locally (or on the apex domain)
 * there are no subdomains, so `/s/<slug>` is used directly and `/` falls back to
 * DEV_BUSINESS_SLUG.
 */

import type { TenantRouting } from "./edge-routing";

/** Hosts/subdomains that never map to a tenant. */
const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "static"]);

/** Strip the port from a Host header value and lower-case it. */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

/**
 * Derive a tenant slug from the request host, or null when the host doesn't
 * identify a tenant (apex domain, `www`, localhost, or no root domain set).
 *
 * @param host  the (already normalizable) Host header
 * @param rootDomain  NEXT_PUBLIC_ROOT_DOMAIN, e.g. "example.com". When unset,
 *   subdomain routing is disabled and this always returns null.
 */
export function tenantSlugFromHost(
  host: string | null | undefined,
  rootDomain: string | null | undefined,
): string | null {
  const h = normalizeHost(host);
  const root = normalizeHost(rootDomain);
  if (!h || !root) return null;

  // Apex or exactly the root domain → no tenant.
  if (h === root || h === `www.${root}`) return null;

  // Must be a subdomain of the root domain.
  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return null;

  // Take the left-most label as the slug (ignores deeper nesting).
  const label = h.slice(0, -suffix.length).split(".")[0];
  if (!label || RESERVED_SUBDOMAINS.has(label)) return null;

  return label;
}

/** How a request host mapped to a tenant. */
export interface HostRoute {
  slug: string;
  /** The (normalized) hostname the request arrived on. */
  hostname: string;
  /** The tenant's canonical hostname, when a verified primary domain exists. */
  primaryHostname: string | null;
  source: "domain" | "subdomain";
}

/**
 * True when a host belongs to the platform itself (apex, www, the configured
 * site host, or a local dev host) rather than to a tenant.
 *
 * Used to tell two different "no tenant" cases apart: the platform's own pages
 * (serve them) versus a domain pointed at us that maps to nothing (404, rather
 * than silently serving the default template).
 */
export function isPlatformHost(
  host: string | null | undefined,
  rootDomain: string | null | undefined,
  platformBase: string | null,
): boolean {
  const h = normalizeHost(host);
  if (!h) return true;

  if (h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1") {
    return true;
  }

  const root = normalizeHost(rootDomain);
  if (root && (h === root || h === `www.${root}`)) return true;

  if (platformBase) {
    try {
      const baseHost = normalizeHost(new URL(platformBase).host);
      if (baseHost && (h === baseHost || h === `www.${baseHost}`)) return true;
    } catch {
      // malformed base URL — fall through
    }
  }

  return false;
}

/**
 * Where a platform-only path (dashboard, auth) should be sent when it's
 * requested on a TENANT host — the platform's own host — or null to allow it
 * through.
 *
 * Returns null when the host isn't a tenant (already the platform), or when the
 * platform base URL is unknown (local dev / single-host deploys), so this can
 * never break an environment that hasn't configured domains.
 */
export function platformRedirectUrl(
  route: HostRoute | null,
  platformBase: string | null,
  pathname: string,
  search = "",
): string | null {
  if (!route || !platformBase) return null;
  return `${platformBase}${pathname}${search}`;
}

/**
 * Resolve a request host to a tenant. Pure — the routing table is passed in, so
 * this is edge-safe and testable.
 *
 * Order: (1) data-driven custom domain (apex/www/any verified hostname), then
 * (2) the derived platform subdomain `<slug>.<root>`. Anything else (apex,
 * localhost) returns null and is left to the caller's dev/marketing fallback.
 */
export function resolveHostRoute(
  host: string | null | undefined,
  rootDomain: string | null | undefined,
  routing: TenantRouting | null,
): HostRoute | null {
  const hostname = normalizeHost(host);
  if (!hostname) return null;

  const entry = routing?.domains?.[hostname];
  if (entry) {
    return {
      slug: entry.slug,
      hostname,
      primaryHostname: routing?.primary?.[entry.slug] ?? null,
      source: "domain",
    };
  }

  const slug = tenantSlugFromHost(hostname, rootDomain);
  if (slug) {
    return {
      slug,
      hostname,
      // Once a custom domain is primary, the platform subdomain redirects to it.
      primaryHostname: routing?.primary?.[slug] ?? null,
      source: "subdomain",
    };
  }

  return null;
}
