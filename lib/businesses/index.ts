import type { BusinessProfile } from "@/types/business";
import { ronies } from "./ronies";
import { arah } from "./arah";

/**
 * Local business registry.
 *
 * Stands in for the database during migration. Production will resolve the
 * tenant from the request host; development resolves it by slug through
 * DEV_BUSINESS_SLUG.
 *
 * The template code is stored ALONGSIDE the profile because a profile only
 * makes sense through the template it was written for: rendering the patisserie
 * content with the barber component loses every field the barber doesn't have,
 * and does it silently. In production this pairing comes from the tenant's
 * `template_code` column.
 */
export interface DevBusiness {
  profile: BusinessProfile;
  templateCode: string;
}

const registry: Record<string, DevBusiness> = {
  ronies: { profile: ronies, templateCode: "barber-luxury" },
  arah: { profile: arah, templateCode: "patisserie-boutique" },
};

/**
 * The merge base for a tenant whose template can't be determined here.
 *
 * Per-TEMPLATE defaults live in templates/registry.ts (`loadTemplate` returns
 * the right one alongside the component) — this is only the fallback for the
 * dev-preview path, and deliberately stays the barber profile so existing
 * behaviour is unchanged.
 */
export const defaultProfile: BusinessProfile = ronies;

/**
 * Resolve the active business for the current render.
 *
 * Dev flow (per skill): read DEV_BUSINESS_SLUG → find business → return profile.
 * Falls back to the first registered business so the template always renders.
 */
export function resolveDevBusiness(): DevBusiness {
  const slug = process.env.DEV_BUSINESS_SLUG?.trim();
  return (
    (slug ? registry[slug] : undefined) ?? {
      profile: ronies,
      templateCode: "barber-luxury",
    }
  );
}
