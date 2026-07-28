import { cache } from "react";
import type { BusinessProfile } from "@/types/business";
import type { Business } from "@/types/business-entity";
import { loadTemplate } from "@/templates/registry";
import { createPublicClient } from "@/lib/supabase/public";
import { BusinessRepository } from "@/repositories/business-repository";
import { DomainRepository } from "@/repositories/domain-repository";
import { buildBusinessProfile } from "@/lib/website/build-profile";

/** Everything the public tenant page needs, from one resolution pass. */
export interface TenantBundle {
  business: Business;
  profile: BusinessProfile;
  /** Verified primary custom domain, when the tenant has one. */
  primaryHostname: string | null;
}

/**
 * Resolve the public BusinessProfile for a tenant by its slug.
 *
 * Reads the active business via the public anon client (relying on the "active
 * businesses are publicly readable" RLS policy) and merges it over the template
 * default. Returns null when no active business owns that slug, so the caller
 * can render a 404. Any transient/DB error also yields null (never leaks another
 * tenant's data or throws on the public path).
 */
export async function loadTenantProfileBySlug(
  slug: string,
): Promise<BusinessProfile | null> {
  return (await loadTenantBySlug(slug))?.profile ?? null;
}

/**
 * Like `loadTenantProfileBySlug` but also returns the underlying Business record
 * (the structured source for JSON-LD) and the tenant's canonical hostname.
 *
 * Wrapped in React `cache` so `generateMetadata` and the page component share a
 * single resolution per request.
 */
export const loadTenantBySlug = cache(
  async (slug: string): Promise<TenantBundle | null> => {
    const clean = slug.trim().toLowerCase();
    if (!clean) return null;

    try {
      const supabase = createPublicClient(); // cookie-less → page stays cacheable
      const business = await new BusinessRepository(supabase).findBySlug(clean);
      if (!business) return null;

      // Non-fatal: if business_domains isn't migrated yet (or is unreachable),
      // fall back to the platform URL rather than failing the whole page.
      let primaryHostname: string | null = null;
      try {
        primaryHostname = await new DomainRepository(supabase).primaryHostname(
          business.id,
        );
      } catch {
        primaryHostname = null;
      }

      // Merge over THIS tenant's template defaults, not a hardcoded one.
      const template = await loadTemplate(business.templateCode);

      return {
        business,
        profile: buildBusinessProfile(template.defaultProfile, business),
        primaryHostname,
      };
    } catch {
      return null;
    }
  },
);
