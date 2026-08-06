import type { BusinessProfile } from "@/types/business";
import { resolveDevBusiness } from "@/lib/businesses";
import { loadTenantBySlug } from "@/lib/tenant/profile";

export interface ApexPreview {
  profile: BusinessProfile;
  /** Which template to render it with. Never assume — see the note below. */
  templateCode: string;
}

/**
 * Resolve what the apex `/` route renders.
 *
 * Multi-tenant resolution by slug lives in lib/tenant (subdomain → /s/<slug>
 * rewrite in the middleware, plus the /s/[slug] route). This `/` entry point is
 * the local/apex convenience view: it renders the DEV_BUSINESS_SLUG tenant, and
 * falls back to the static template default so the site keeps rendering even
 * before Supabase/data is configured.
 *
 * The TEMPLATE CODE comes back with the profile because the two must not be
 * chosen independently. A profile carries the content its own template expects;
 * pairing it with a different component renders a patisserie's menu through a
 * barber's markup, and every field the other template doesn't have goes
 * silently missing.
 */
export async function loadBusinessProfile(): Promise<ApexPreview> {
  const slug = process.env.DEV_BUSINESS_SLUG?.trim();
  // The seeded pair, used until (and if) the database answers for this slug.
  const fallback = resolveDevBusiness();
  if (!slug) return fallback;

  const tenant = await loadTenantBySlug(slug);
  if (!tenant) return fallback;

  return { profile: tenant.profile, templateCode: tenant.business.templateCode };
}
