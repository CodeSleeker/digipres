"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformWriter } from "@/lib/auth/require-platform-admin";
import { BusinessRepository } from "@/repositories/business-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";
import { logError } from "@/lib/observability/logger";
import { updateBusinessSchema } from "@/schemas/business";

/**
 * Staff editing a client's own details, without impersonating them.
 *
 * The business name was previously reachable only through the client's Google
 * Profile wizard — so fixing a typo meant opening a 30-minute "act as" session
 * and walking into step 1 of a flow that has nothing to do with naming.
 *
 * SLUG IS DELIBERATELY NOT EDITABLE HERE. It is the tenant's public address:
 * changing it moves the live site, breaks every link already shared, and
 * invalidates the old cache. That deserves its own flow with a confirmation and
 * a redirect from the old slug, not a text box beside the name.
 *
 * WHY SERVICE-ROLE: the only UPDATE policy on `businesses` is owner-scoped, and
 * migration 0012 gave platform staff SELECT only — a staff-client UPDATE would
 * match zero rows and succeed silently. `requirePlatformWriter()` is the
 * authorization gate. Same reasoning as features/platform/lifecycle.ts.
 *
 * NOTE: `redirect()` throws, so every call to it stays OUTSIDE the try/catch.
 */
function fail(businessId: string, message: string): never {
  redirect(
    `/platform/businesses/${businessId}?detailsError=${encodeURIComponent(message)}`,
  );
}

export async function updateBusinessDetails(formData: FormData): Promise<void> {
  const { user, role } = await requirePlatformWriter();

  const businessId = String(formData.get("businessId") ?? "");
  if (!businessId) redirect("/platform/businesses");

  // Reuse the tenant-facing rules so a name valid here is valid there.
  const parsed = updateBusinessSchema
    .pick({ name: true })
    .safeParse({ name: formData.get("name") });
  if (!parsed.success || !parsed.data.name) {
    fail(businessId, parsed.error?.issues[0]?.message ?? "Enter a name.");
  }

  let slug: string | null = null;
  try {
    const admin = createServiceClient();
    const repo = new BusinessRepository(admin);

    const existing = await repo.findById(businessId);
    if (!existing) fail(businessId, "That business no longer exists.");
    slug = existing.slug;

    await repo.update(businessId, { name: parsed.data.name });

    await new AuditRepository(admin).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "business.updated",
      entity: "business",
      metadata: {
        field: "name",
        from: existing.name,
        to: parsed.data.name,
        actorRole: role,
      },
    });
  } catch (error) {
    logError(error, { scope: "platform:updateBusinessDetails" });
    fail(businessId, "Could not update the business.");
  }

  revalidatePath(`/platform/businesses/${businessId}`);
  // The name is on the public site — the header wordmark, the SEO title and the
  // JSON-LD all derive from it, so the tenant's cache has to go too.
  revalidateTenantSite(slug);
}
