import type { BusinessProfile } from "@/types/business";
import { ronies } from "./ronies";

/**
 * Local business registry.
 *
 * Stands in for the database during migration. Production will resolve the
 * tenant from the request host; development resolves it by slug through
 * DEV_BUSINESS_SLUG.
 */
const registry: Record<string, BusinessProfile> = {
  ronies,
};

/**
 * The template's default profile, used as the merge base for ANY tenant (all
 * tenants currently share the luxury barber template). A stored Business is
 * merged over this so an un-customized site still renders.
 */
export const defaultProfile: BusinessProfile = ronies;

/**
 * Resolve the active business for the current render.
 *
 * Dev flow (per skill): read DEV_BUSINESS_SLUG → find business → return profile.
 * Falls back to the first registered business so the template always renders.
 */
export function resolveDevBusiness(): BusinessProfile {
  const slug = process.env.DEV_BUSINESS_SLUG?.trim();
  if (slug && registry[slug]) return registry[slug];
  return ronies;
}
