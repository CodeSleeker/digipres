import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BusinessRepository } from "@/repositories/business-repository";

/**
 * Invalidate the cached public pages for an owner's tenant after their content
 * or business fields change.
 *
 * Tenant sites render at `/s/[slug]` (subdomains rewrite to it), so the owner's
 * OWN slug is what must be revalidated. The apex `/` is also revalidated because
 * it renders the DEV_BUSINESS_SLUG tenant in dev/apex. This is what makes CMS and
 * onboarding edits appear on the live site.
 */
export async function revalidateOwnerSite(
  supabase: SupabaseClient<Database>,
  ownerId: string,
): Promise<void> {
  const business = await new BusinessRepository(supabase).findByOwnerId(
    ownerId,
  );
  revalidateTenantSite(business?.slug ?? null);
}

/**
 * Same, for a tenant already resolved by slug.
 *
 * Prefer this wherever the acting tenant is known. Looking the business up by
 * *owner* is wrong under impersonation: the edit lands on the client's business
 * while the acting user is a staff member, so the owner lookup would purge the
 * staff member's own page and leave the client's stale.
 */
export function revalidateTenantSite(slug: string | null): void {
  if (slug) revalidatePath(`/s/${slug}`);
  revalidatePath("/"); // apex / dev-slug view
}
