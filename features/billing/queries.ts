import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SubscriptionRepository } from "@/repositories/subscription-repository";
import {
  defaultFeatures,
  isEntitled,
  resolveFeatures,
  type FeatureKey,
} from "@/lib/features/catalogue";
import type { Entitlement } from "@/types/billing";

/**
 * What a business is entitled to: defaults ← plan ← per-business overrides.
 *
 * A business with no subscription — or one that has lapsed — falls back to the
 * DEFAULT plan rather than losing everything, so a billing problem degrades
 * service instead of breaking the product. `entitled` records which happened.
 *
 * Cached per request: gating is checked in layouts, pages and actions, and they
 * should share one lookup.
 */
export const getEntitlement = cache(
  async (
    supabase: SupabaseClient<Database>,
    businessId: string,
  ): Promise<Entitlement> => {
    const repo = new SubscriptionRepository(supabase);

    try {
      const [subscription, overrides] = await Promise.all([
        repo.findSubscription(businessId),
        repo.overridesFor(businessId),
      ]);

      const entitled = isEntitled(subscription?.status);
      const plan =
        subscription && entitled
          ? await repo.findPlanById(subscription.planId)
          : await repo.defaultPlan();

      return {
        features: resolveFeatures(plan?.features, overrides),
        plan,
        subscription,
        entitled,
      };
    } catch {
      // Billing tables absent or unreachable — never take the app down over it.
      return {
        features: defaultFeatures(),
        plan: null,
        subscription: null,
        entitled: false,
      };
    }
  },
);

/** Convenience for a single gate check. */
export async function hasFeature(
  supabase: SupabaseClient<Database>,
  businessId: string,
  key: FeatureKey,
): Promise<boolean> {
  const { features } = await getEntitlement(supabase, businessId);
  return features[key];
}
