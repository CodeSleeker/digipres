import type { SubscriptionStatusEnum } from "./database";
import type { FeatureSet } from "@/lib/features/catalogue";

export type SubscriptionStatus = SubscriptionStatusEnum;

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  interval: string;
  /** Raw jsonb; resolved through lib/features, which ignores unknown keys. */
  features: Record<string, unknown>;
  isDefault: boolean;
}

export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
}

/** What a business can actually do right now, and why. */
export interface Entitlement {
  features: FeatureSet;
  plan: Plan | null;
  subscription: Subscription | null;
  /** False when the subscription lapsed and the default plan is standing in. */
  entitled: boolean;
}
