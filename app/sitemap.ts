import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { BusinessRepository } from "@/repositories/business-repository";
import { DomainRepository } from "@/repositories/domain-repository";
import { siteBaseUrl, tenantCanonicalUrl } from "@/lib/tenant/urls";
import { resolveRequestHost } from "@/lib/tenant/request-host";
import { buildSitemapUrls, type SitemapTenant } from "@/lib/tenant/sitemap";

/**
 * Serves /sitemap.xml — HOST-AWARE, so each tenant's domain gets a valid,
 * self-contained sitemap and never enumerates other customers.
 * The scoping rule itself lives in lib/tenant/sitemap.ts (pure, unit-tested).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await resolveRequestHost();

  let tenants: SitemapTenant[] = [];
  const onOwnDomain = new Set<string>();

  // Only the platform sitemap needs the tenant list.
  if (!host.slug) {
    try {
      const supabase = createPublicClient();
      tenants = await new BusinessRepository(supabase).listActiveSlugs();
      try {
        for (const route of await new DomainRepository(
          supabase,
        ).listVerifiedRoutes()) {
          if (route.isPrimary) onOwnDomain.add(route.slug);
        }
      } catch {
        // No domain table — every tenant is on a platform subdomain.
      }
    } catch {
      // Degrade to the apex-only sitemap.
    }
  }

  return buildSitemapUrls({
    host,
    siteUrl: siteBaseUrl(),
    tenants,
    onOwnDomain,
    platformUrlFor: tenantCanonicalUrl,
  }).map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: "weekly" as const,
    priority: entry.priority,
  }));
}
