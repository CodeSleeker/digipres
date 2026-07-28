import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getEntitlement } from "@/features/billing/queries";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { FEATURES, type FeatureKey } from "./catalogue";

/**
 * Page-level gate in one line: resolves the tenant and enforces the capability.
 *
 * Every page behind a paid feature must call this. Hiding the nav link is not a
 * control — without this, the feature is reachable by typing the URL.
 */
export async function guardPage(key: FeatureKey): Promise<void> {
  const { supabase, businessId } = await getOwnerContext();
  await requireFeature(supabase, businessId, key);
}

/**
 * Enforce a capability on a PAGE. Hiding a nav link is presentation; this is the
 * gate — someone with the URL still can't reach a feature they don't have.
 */
export async function requireFeature(
  supabase: SupabaseClient<Database>,
  businessId: string | null,
  key: FeatureKey,
): Promise<void> {
  if (!businessId) redirect("/admin");
  const { features } = await getEntitlement(supabase, businessId);
  if (!features[key]) redirect("/admin?unavailable=" + key);
}

/**
 * Enforce a capability in a SERVER ACTION, where redirecting would be wrong.
 * Returns an error message, or null when allowed.
 */
export async function featureError(
  supabase: SupabaseClient<Database>,
  businessId: string | null,
  key: FeatureKey,
): Promise<string | null> {
  if (!businessId) return "Create your business profile first.";
  const { features } = await getEntitlement(supabase, businessId);
  return features[key]
    ? null
    : `${FEATURES[key].label} isn't included in your current plan.`;
}
