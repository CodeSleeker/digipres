import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { PlatformAdminRepository } from "@/repositories/platform-admin-repository";

export const PLATFORM_HOME = "/platform";
export const TENANT_HOME = "/admin";

/**
 * Where a signed-in user belongs.
 *
 * Platform staff go to the portal; everyone else to their own back office.
 * Sending staff to /admin first was confusing: they'd land on a tenant
 * dashboard (or an empty one) and have to navigate to /platform themselves.
 *
 * RLS lets any authenticated user read only their OWN platform_admins row, so
 * this doubles as the "am I staff?" check without exposing the roster. Falls
 * back to the tenant home if the lookup fails — a routing hint must never be
 * the thing that blocks a login.
 */
export async function landingPathFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  try {
    const staff = await new PlatformAdminRepository(supabase).findByUserId(
      userId,
    );
    return staff ? PLATFORM_HOME : TENANT_HOME;
  } catch {
    return TENANT_HOME;
  }
}
