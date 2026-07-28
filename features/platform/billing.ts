"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformWriter } from "@/lib/auth/require-platform-admin";
import { SubscriptionRepository } from "@/repositories/subscription-repository";
import { AuditRepository } from "@/repositories/audit-repository";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features/catalogue";
import { logError } from "@/lib/observability/logger";

/**
 * These run from plain server-component forms, so they return void. Failures
 * redirect back with `?billingError=` rather than failing silently.
 */
function fail(businessId: string, message: string): never {
  redirect(
    `/platform/businesses/${businessId}?billingError=${encodeURIComponent(message)}`,
  );
}

/**
 * Put a business on a plan. Platform staff only — RLS refuses this for an owner,
 * so self-upgrading isn't possible even with a crafted request.
 */
export async function setBusinessPlan(formData: FormData): Promise<void> {
  const { supabase, user, role } = await requirePlatformWriter();

  const businessId = String(formData.get("businessId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!businessId) redirect("/platform/businesses");
  if (!planId) fail(businessId, "Choose a plan.");

  try {
    await new SubscriptionRepository(supabase).setPlan(businessId, planId);

    await new AuditRepository(supabase).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "subscription.plan_changed",
      entity: "subscription",
      metadata: { planId, actorRole: role },
    });
  } catch (error) {
    logError(error, { scope: "platform:setBusinessPlan" });
    fail(businessId, "Could not change the plan.");
  }

  revalidatePath(`/platform/businesses/${businessId}`);
}

/**
 * Override a single capability for one business — "grant this client the thing
 * their plan doesn't include" — or clear the override so it follows the plan.
 */
export async function setFeatureOverride(formData: FormData): Promise<void> {
  const { supabase, user, role } = await requirePlatformWriter();

  const businessId = String(formData.get("businessId") ?? "");
  const featureKey = String(formData.get("featureKey") ?? "") as FeatureKey;
  const value = String(formData.get("value") ?? "");

  if (!businessId) redirect("/platform/businesses");
  if (!FEATURE_KEYS.includes(featureKey)) fail(businessId, "Unknown feature.");

  try {
    const repo = new SubscriptionRepository(supabase);
    if (value === "inherit") {
      await repo.clearOverride(businessId, featureKey);
    } else {
      await repo.setOverride(businessId, featureKey, value === "on");
    }

    await new AuditRepository(supabase).record({
      actorUserId: user.id,
      actingBusinessId: businessId,
      action: "feature.override_set",
      entity: "business_features",
      metadata: { featureKey, value, actorRole: role },
    });
  } catch (error) {
    logError(error, { scope: "platform:setFeatureOverride" });
    fail(businessId, "Could not update the feature.");
  }

  revalidatePath(`/platform/businesses/${businessId}`);
}
