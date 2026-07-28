import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { resolveRequestHost } from "@/lib/tenant/request-host";

/**
 * Serves /robots.txt — HOST-AWARE.
 *
 * Every host allows crawling of the public site and disallows the dashboard and
 * API. The `Sitemap:` line points at the sitemap for *this* host, so a tenant's
 * custom domain advertises its own sitemap rather than the platform's.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { hostname, isPlatformHost } = await resolveRequestHost();
  const base = isPlatformHost ? siteBaseUrl() : `https://${hostname}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
