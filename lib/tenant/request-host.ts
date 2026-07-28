import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { DomainRepository } from "@/repositories/domain-repository";
import { normalizeHost, tenantSlugFromHost } from "./resolve";

/**
 * Server-side (Node) host → tenant resolution, for routes that must vary by
 * host: robots.txt and sitemap.xml.
 *
 * The edge middleware uses Edge Config for speed; here we can query the database
 * directly, which is simpler and always current.
 */
export interface HostContext {
  hostname: string;
  /** Tenant slug when this host belongs to a tenant, else null. */
  slug: string | null;
  /** True when this is the platform apex/www (or localhost in dev). */
  isPlatformHost: boolean;
}

export async function resolveRequestHost(): Promise<HostContext> {
  const requestHeaders = await headers();
  const hostname = normalizeHost(requestHeaders.get("host"));

  // 1. Custom domain (data-driven). Non-fatal if business_domains is absent.
  try {
    const supabase = createPublicClient();
    const route = await new DomainRepository(supabase).resolveRoute(hostname);
    if (route) return { hostname, slug: route.slug, isPlatformHost: false };
  } catch {
    // table not migrated / unreachable → fall through to the derived path
  }

  // 2. Platform subdomain, derived from the slug.
  const slug = tenantSlugFromHost(
    hostname,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  );
  if (slug) return { hostname, slug, isPlatformHost: false };

  // 3. Platform apex / www / localhost.
  return { hostname, slug: null, isPlatformHost: true };
}
