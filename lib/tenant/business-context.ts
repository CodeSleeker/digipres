import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import { requireUser } from "@/lib/auth/require-user";
import {
  readImpersonationCookie,
  verifyImpersonationToken,
} from "@/lib/auth/impersonation";
import { createServiceClient } from "@/lib/supabase/service";
import { BusinessRepository } from "@/repositories/business-repository";
import { PlatformAdminRepository } from "@/repositories/platform-admin-repository";

/**
 * WHICH TENANT is this request acting on?
 *
 * This is the single place that answers that question. Services and
 * repositories are business-scoped — they take a `businessId` and never resolve
 * ownership themselves — so when platform staff gain "act as" (impersonation),
 * only this resolver changes; nothing downstream does.
 */
export interface OwnerContext {
  supabase: SupabaseClient<Database>;
  user: User;
  /** Null until the owner completes the first onboarding step. */
  business: Business | null;
  businessId: string | null;
  /** True when platform staff are acting on a tenant's behalf. Always false today. */
  isImpersonating: boolean;
}

/** Same, with a guaranteed business. */
export interface BusinessContext extends OwnerContext {
  business: Business;
  businessId: string;
}

/**
 * Resolve the acting user and their tenant (which may not exist yet). Use where
 * a business-less owner is valid — onboarding, empty-state dashboards.
 */
export async function getOwnerContext(): Promise<OwnerContext> {
  const { supabase, user } = await requireUser();

  const impersonated = await resolveImpersonation(supabase, user);
  if (impersonated) return impersonated;

  const business = await new BusinessRepository(supabase).findByOwnerId(
    user.id,
  );
  return {
    supabase,
    user,
    business,
    businessId: business?.id ?? null,
    isImpersonating: false,
  };
}

/**
 * Platform staff acting on a tenant's behalf, or null for a normal session.
 *
 * THREE conditions must all hold — possession of the cookie is never enough:
 *   1. the token verifies (signature, expiry, and issued to THIS user), and
 *   2. the user is still platform staff *right now*, re-read from the database,
 *      so revoking staff access ends live sessions immediately, and
 *   3. the target business still exists.
 *
 * Data access then uses the SERVICE-ROLE client, because RLS would otherwise
 * (correctly) refuse to let this user touch another tenant's rows. That makes
 * the business-scoping in the services the effective guard — which is precisely
 * why they were refactored to take a businessId.
 */
async function resolveImpersonation(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<OwnerContext | null> {
  const token = await readImpersonationCookie();
  if (!token) return null;

  const businessId = verifyImpersonationToken(token, user.id);
  if (!businessId) return null;

  const staff = await new PlatformAdminRepository(supabase).findByUserId(
    user.id,
  );
  if (!staff) return null;

  try {
    const service = createServiceClient();
    const business = await new BusinessRepository(service).findById(businessId);
    if (!business) return null;

    return {
      supabase: service,
      user,
      business,
      businessId: business.id,
      isImpersonating: true,
    };
  } catch {
    // Service role unavailable — fall back to the user's own context.
    return null;
  }
}

/**
 * Resolve the tenant context or redirect to onboarding. Use on pages/actions
 * that cannot function without a business.
 */
export async function requireBusinessContext(): Promise<BusinessContext> {
  const context = await getOwnerContext();
  if (!context.business) redirect("/admin/onboarding");
  return context as BusinessContext;
}
