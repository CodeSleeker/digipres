"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { requirePlatformWriter } from "@/lib/auth/require-platform-admin";
import {
  clearImpersonationCookie,
  readImpersonationCookie,
  setImpersonationCookie,
  verifyImpersonationToken,
} from "@/lib/auth/impersonation";
import { AuditRepository } from "@/repositories/audit-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { logError } from "@/lib/observability/logger";

/**
 * Begin acting as a tenant, so staff can help a client inside their own back
 * office. `read_only` staff are refused by requirePlatformWriter().
 *
 * Both the start and the end are written to the audit log, so every window in
 * which a tenant's data could have been touched by staff is attributable.
 */
export async function startImpersonation(formData: FormData): Promise<void> {
  const { supabase, user, role } = await requirePlatformWriter();

  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) redirect("/platform/businesses");

  // Platform staff can read any business (migration 0012).
  const business = await new BusinessRepository(supabase).findById(businessId);
  if (!business) redirect("/platform/businesses");

  const issued = await setImpersonationCookie(businessId, user.id);
  if (!issued) {
    // No signing key configured — fail closed rather than silently not working.
    redirect("/platform/businesses?error=impersonation-unavailable");
  }

  try {
    await new AuditRepository(supabase).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "impersonation.started",
      entity: "business",
      entityId: businessId,
      metadata: { actorRole: role, businessName: business.name },
    });
  } catch (error) {
    logError(error, { scope: "platform:startImpersonation" });
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

/** End the session and return to the platform portal. */
export async function stopImpersonation(): Promise<void> {
  const { supabase, user } = await requireUser();

  const token = await readImpersonationCookie();
  const businessId = token
    ? verifyImpersonationToken(token, user.id)
    : null;

  await clearImpersonationCookie();

  if (businessId) {
    try {
      await new AuditRepository(supabase).record({
        actorUserId: user.id,
        actingBusinessId: businessId,
        action: "impersonation.ended",
        entity: "business",
        entityId: businessId,
      });
    } catch (error) {
      logError(error, { scope: "platform:stopImpersonation" });
    }
  }

  revalidatePath("/admin", "layout");
  redirect("/platform");
}
