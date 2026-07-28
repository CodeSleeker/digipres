"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  requirePlatformWriter,
  requireSuperAdmin,
} from "@/lib/auth/require-platform-admin";
import { BusinessRepository } from "@/repositories/business-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";
import { logError } from "@/lib/observability/logger";
import type { Business } from "@/types/business-entity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client lifecycle: suspend, reactivate, remove.
 *
 * Suspension is the reversible control — the public site stops resolving
 * (BusinessRepository.findBySlug filters to `active`) and the owner sees a
 * notice instead of the dashboard, but nothing is destroyed and the slug stays
 * theirs. Removal is a SOFT delete, so the row and its data survive and it can
 * be undone in SQL; a hard delete cascades across every tenant table and is
 * deliberately not exposed in the UI.
 *
 * These run from plain server-component forms, so they return void.
 *
 * NOTE: `redirect()` works by throwing, so every call to it stays OUTSIDE the
 * try/catch — otherwise the catch would swallow the redirect and report a
 * failure that never happened.
 *
 * WHY SERVICE-ROLE: the only UPDATE policy on `businesses` is owner-scoped
 * (`owner_id = auth.uid()`), and migration 0012 gave platform staff SELECT
 * only. A staff-client UPDATE would therefore match zero rows and *succeed
 * silently* — the worst kind of failure. Writes go through the service client,
 * exactly as staff onboarding does, and `requirePlatformWriter()` /
 * `requireSuperAdmin()` above are the authorization gate.
 */
function fail(businessId: string, message: string): never {
  redirect(
    `/platform/businesses/${businessId}?lifecycleError=${encodeURIComponent(message)}`,
  );
}

function readBusinessId(formData: FormData): string {
  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) redirect("/platform/businesses");
  return businessId;
}

/**
 * The privileged client these writes need, plus the target business.
 * Both resolved OUTSIDE any try/catch that could swallow a redirect.
 */
async function loadTarget(
  businessId: string,
): Promise<{ admin: SupabaseClient<Database>; business: Business }> {
  let admin: SupabaseClient<Database> | null = null;
  let business: Business | null = null;
  try {
    admin = createServiceClient();
    business = await new BusinessRepository(admin).findById(businessId);
  } catch (error) {
    logError(error, { scope: "platform:lifecycle:load" });
  }

  if (!admin) {
    fail(businessId, "Service role isn't configured on this deployment.");
  }
  if (!business) fail(businessId, "That business no longer exists.");
  return { admin, business };
}

/** Stop service without destroying anything. Reversible. */
export async function suspendBusiness(formData: FormData): Promise<void> {
  const { user, role } = await requirePlatformWriter();
  const businessId = readBusinessId(formData);
  const { admin, business } = await loadTarget(businessId);

  let ok = true;
  try {
    await new BusinessRepository(admin).setStatus(businessId, "suspended");
    await new AuditRepository(admin).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "business.suspended",
      entity: "business",
      entityId: businessId,
      metadata: { actorRole: role, businessName: business.name },
    });
  } catch (error) {
    logError(error, { scope: "platform:suspendBusiness" });
    ok = false;
  }
  if (!ok) fail(businessId, "Could not suspend this business.");

  // The public site must stop serving now, not at the next rebuild.
  revalidateTenantSite(business.slug);
  revalidatePath(`/platform/businesses/${businessId}`);
}

/** Put a suspended business back into service. */
export async function reactivateBusiness(formData: FormData): Promise<void> {
  const { user, role } = await requirePlatformWriter();
  const businessId = readBusinessId(formData);
  const { admin, business } = await loadTarget(businessId);

  let ok = true;
  try {
    await new BusinessRepository(admin).setStatus(businessId, "active");
    await new AuditRepository(admin).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "business.reactivated",
      entity: "business",
      entityId: businessId,
      metadata: { actorRole: role, businessName: business.name },
    });
  } catch (error) {
    logError(error, { scope: "platform:reactivateBusiness" });
    ok = false;
  }
  if (!ok) fail(businessId, "Could not reactivate this business.");

  revalidateTenantSite(business.slug);
  revalidatePath(`/platform/businesses/${businessId}`);
}

/**
 * Remove a client (soft delete). SUPER ADMIN only — support staff may stop
 * service, but ending a client relationship is an owner-level decision.
 *
 * The slug must be typed back, so this can't be a mis-click. The row is
 * retained (`deleted_at`), which also frees the slug and the owner account for
 * reuse: those unique indexes are partial on `deleted_at is null`.
 */
export async function deleteBusiness(formData: FormData): Promise<void> {
  const { user, role } = await requireSuperAdmin();
  const businessId = readBusinessId(formData);
  const { admin, business } = await loadTarget(businessId);

  const typed = String(formData.get("confirmSlug") ?? "").trim();
  if (typed !== business.slug) {
    fail(businessId, `Type "${business.slug}" exactly to confirm removal.`);
  }

  let ok = true;
  try {
    await new BusinessRepository(admin).softDelete(businessId);
    await new AuditRepository(admin).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "business.deleted",
      entity: "business",
      entityId: businessId,
      metadata: {
        actorRole: role,
        businessName: business.name,
        slug: business.slug,
      },
    });
  } catch (error) {
    logError(error, { scope: "platform:deleteBusiness" });
    ok = false;
  }
  if (!ok) fail(businessId, "Could not remove this business.");

  revalidateTenantSite(business.slug);
  revalidatePath("/platform/businesses");
  redirect("/platform/businesses?removed=1");
}
