import type { HostContext } from "./request-host";

/** A tenant considered for the platform sitemap. */
export interface SitemapTenant {
  slug: string;
  updatedAt: string | null;
}

export interface SitemapUrl {
  url: string;
  lastModified: Date;
  priority: number;
}

/**
 * Decide which URLs a sitemap should list for a given host — the rule that keeps
 * one customer's domain from enumerating every other customer.
 *
 *  - tenant host  → only that tenant's own site
 *  - platform apex → the apex plus tenants that live on platform subdomains
 *    (tenants on their own domain publish their sitemap there; a cross-domain
 *    entry would be ignored by crawlers anyway)
 *
 * Pure so it can be unit-tested without a request context.
 */
export function buildSitemapUrls(params: {
  host: HostContext;
  siteUrl: string;
  tenants: SitemapTenant[];
  /** Slugs whose canonical home is their own custom domain. */
  onOwnDomain: Set<string>;
  platformUrlFor: (slug: string) => string;
}): SitemapUrl[] {
  const { host, siteUrl, tenants, onOwnDomain, platformUrlFor } = params;

  if (host.slug) {
    return [
      {
        url: `https://${host.hostname}`,
        lastModified: new Date(),
        priority: 1,
      },
    ];
  }

  const entries: SitemapUrl[] = [
    { url: siteUrl, lastModified: new Date(), priority: 1 },
  ];

  for (const tenant of tenants) {
    if (onOwnDomain.has(tenant.slug)) continue;
    entries.push({
      url: platformUrlFor(tenant.slug),
      lastModified: tenant.updatedAt ? new Date(tenant.updatedAt) : new Date(),
      priority: 0.8,
    });
  }

  return entries;
}
