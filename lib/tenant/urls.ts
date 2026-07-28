/**
 * Canonical public URLs for the platform and its tenants. One source of truth so
 * robots.txt, sitemap.xml, and each page's canonical/OG metadata always agree.
 *
 * - NEXT_PUBLIC_SITE_URL   the apex base, e.g. https://example.com
 * - NEXT_PUBLIC_ROOT_DOMAIN when set, tenants live on subdomains and the
 *                           subdomain is the canonical host; otherwise the
 *                           canonical is the `/s/<slug>` path.
 */

/**
 * The platform's own base URL, or null when it can't be determined.
 *
 * Unlike `siteBaseUrl()` this never falls back to localhost — callers use it to
 * decide whether to redirect, and a bogus target is worse than not redirecting.
 */
export function platformBaseUrl(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  return root ? `https://${root}` : null;
}

/** Apex/base site URL, without a trailing slash. */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (root) return `https://${root}`;

  return "http://localhost:3000"; // dev fallback
}

/**
 * A tenant's platform-provided URL: the subdomain when ROOT_DOMAIN is set,
 * otherwise the internal `/s/<slug>` path. This is the fallback used when a
 * business has no verified custom domain.
 */
export function tenantCanonicalUrl(slug: string): string {
  const clean = slug.trim().toLowerCase();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (root) return `https://${clean}.${root}`;
  return `${siteBaseUrl()}/s/${clean}`;
}

/**
 * The canonical URL for a tenant, preferring its verified primary custom domain
 * and falling back to the platform URL. Everything public (canonical tag, OG
 * url, sitemap) uses this so `/s/<slug>` is never advertised.
 */
export function canonicalUrlFor(
  slug: string,
  primaryHostname: string | null | undefined,
): string {
  return primaryHostname
    ? `https://${primaryHostname}`
    : tenantCanonicalUrl(slug);
}
