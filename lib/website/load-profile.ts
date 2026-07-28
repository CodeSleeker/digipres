import type { BusinessProfile } from "@/types/business";
import { resolveDevBusiness } from "@/lib/businesses";
import { loadTenantProfileBySlug } from "@/lib/tenant/profile";

/**
 * Resolve the BusinessProfile rendered at the apex `/` route.
 *
 * Multi-tenant resolution by slug lives in lib/tenant (subdomain → /s/<slug>
 * rewrite in the middleware, plus the /s/[slug] route). This `/` entry point is
 * the local/apex convenience view: it renders the DEV_BUSINESS_SLUG tenant, and
 * falls back to the static template default so the site keeps rendering even
 * before Supabase/data is configured.
 */
export async function loadBusinessProfile(): Promise<BusinessProfile> {
  const base = resolveDevBusiness();
  const slug = process.env.DEV_BUSINESS_SLUG?.trim();
  if (!slug) return base;

  const profile = await loadTenantProfileBySlug(slug);
  return profile ?? base;
}
