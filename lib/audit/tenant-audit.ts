import { headers } from "next/headers";
import type { OwnerContext } from "@/lib/tenant/business-context";
import { AuditRepository } from "@/repositories/audit-repository";
import { logError } from "@/lib/observability/logger";

/**
 * Record ONE mutation made by platform staff acting as a tenant.
 *
 * The session-level `impersonation.started` / `.ended` pair says *when* staff
 * were inside an account. It cannot answer "who changed this record?" — for
 * that, each mutation has to be attributable on its own. This writes that row.
 *
 * A no-op for ordinary owners: they are editing their own data, which is the
 * product working normally, and `audit_log` is platform-staff-only under RLS.
 *
 * Never throws. An audit backend that is down must not fail the client's edit
 * — the failure is logged instead, so it surfaces in monitoring rather than in
 * the owner's browser.
 */
export async function auditTenantAction(
  context: Pick<
    OwnerContext,
    "supabase" | "user" | "businessId" | "isImpersonating"
  >,
  action: string,
  details: {
    entity?: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  if (!context.isImpersonating || !context.businessId) return;

  try {
    await new AuditRepository(context.supabase).record({
      // The STAFF member, not the tenant owner whose account this is.
      actorUserId: context.user.id,
      actingBusinessId: context.businessId,
      action,
      entity: details.entity ?? null,
      entityId: details.entityId ?? null,
      metadata: details.metadata,
      ip: await clientIp(),
    });
  } catch (error) {
    logError(error, { scope: "audit:tenant", action });
  }
}

/**
 * Best-effort caller IP from the proxy headers. Only the first hop is kept —
 * the rest of an `x-forwarded-for` chain is attacker-controlled.
 */
async function clientIp(): Promise<string | null> {
  try {
    const header = await headers();
    const forwarded = header.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwarded || header.get("x-real-ip")?.trim();
    return ip ? ip.slice(0, 45) : null; // 45 = longest IPv6 form
  } catch {
    return null; // Outside a request scope (tests, cron).
  }
}
