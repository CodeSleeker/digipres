import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { FeatureKey } from "@/lib/features/catalogue";
import type {
  Plan,
  Subscription,
  SubscriptionStatus,
} from "@/types/billing";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

/**
 * Plans, subscriptions and per-business feature overrides.
 *
 * Reads are available to the owner (their own) and to platform staff (any);
 * every write here requires platform staff, enforced by RLS — an owner cannot
 * upgrade themselves.
 */
export class SubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listPlans(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .from("plans")
      .select("*")
      .order("price_cents", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toPlan);
  }

  async defaultPlan(): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from("plans")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlan(data) : null;
  }

  async findSubscription(businessId: string): Promise<Subscription | null> {
    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) throw error;
    return data ? toSubscription(data) : null;
  }

  async findPlanById(planId: string): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlan(data) : null;
  }

  /** Per-business overrides as a plain map, ignoring unknown keys upstream. */
  async overridesFor(
    businessId: string,
  ): Promise<Record<string, boolean>> {
    const { data, error } = await this.supabase
      .from("business_features")
      .select("feature_key,enabled")
      .eq("business_id", businessId);
    if (error) throw error;

    const out: Record<string, boolean> = {};
    for (const row of data ?? []) out[row.feature_key] = row.enabled;
    return out;
  }

  /* --- Platform-staff writes (RLS-gated) --------------------------------- */

  async setPlan(
    businessId: string,
    planId: string,
    status: SubscriptionStatus = "active",
  ): Promise<void> {
    const { error } = await this.supabase.from("subscriptions").upsert(
      { business_id: businessId, plan_id: planId, status },
      { onConflict: "business_id" },
    );
    if (error) throw error;
  }

  async setOverride(
    businessId: string,
    featureKey: FeatureKey,
    enabled: boolean,
  ): Promise<void> {
    const { error } = await this.supabase.from("business_features").upsert(
      { business_id: businessId, feature_key: featureKey, enabled },
      { onConflict: "business_id,feature_key" },
    );
    if (error) throw error;
  }

  /** Drop an override so the feature falls back to the plan. */
  async clearOverride(
    businessId: string,
    featureKey: FeatureKey,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("business_features")
      .delete()
      .eq("business_id", businessId)
      .eq("feature_key", featureKey);
    if (error) throw error;
  }
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    priceCents: row.price_cents,
    interval: row.interval,
    features: (row.features ?? {}) as Record<string, unknown>,
    isDefault: row.is_default,
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    businessId: row.business_id,
    planId: row.plan_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
  };
}
