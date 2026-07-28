/**
 * The capabilities a business can have, and how they resolve.
 *
 * Keys live in code because the code is what gates on them; plans and overrides
 * in the database refer to these keys. An unknown key in the database is ignored
 * rather than trusted, so a typo can't silently enable something.
 */
export const FEATURE_KEYS = [
  "appointments",
  "reviews",
  "analytics",
  "ai_messages",
  "custom_domains",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureMeta {
  label: string;
  description: string;
  /** Used when neither the plan nor an override says anything. */
  fallback: boolean;
}

export const FEATURES: Record<FeatureKey, FeatureMeta> = {
  appointments: {
    label: "Appointments",
    description: "Calendar, bookings, and completion-triggered review requests.",
    fallback: true,
  },
  reviews: {
    label: "Review automation",
    description: "Queued thank-you, review request and reminder SMS.",
    fallback: true,
  },
  analytics: {
    label: "Analytics",
    description: "Business dashboards and charts.",
    fallback: true,
  },
  ai_messages: {
    label: "AI messages",
    description: "AI-generated SMS variations.",
    fallback: false,
  },
  custom_domains: {
    label: "Custom domains",
    description: "Serve the website on the client's own domain.",
    fallback: false,
  },
};

export type FeatureSet = Record<FeatureKey, boolean>;

/** Every feature at its code-level fallback. */
export function defaultFeatures(): FeatureSet {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, FEATURES[key].fallback]),
  ) as FeatureSet;
}

/**
 * Resolve effective capabilities: defaults ← plan ← per-business overrides.
 *
 * Only known keys are considered, and only real booleans — a malformed jsonb
 * value falls through to the layer beneath rather than being coerced.
 */
export function resolveFeatures(
  planFeatures: Record<string, unknown> | null | undefined,
  overrides: Record<string, boolean> | null | undefined,
): FeatureSet {
  const resolved = defaultFeatures();

  for (const key of FEATURE_KEYS) {
    const fromPlan = planFeatures?.[key];
    if (typeof fromPlan === "boolean") resolved[key] = fromPlan;

    const override = overrides?.[key];
    if (typeof override === "boolean") resolved[key] = override;
  }

  return resolved;
}

/** Statuses that actually entitle a business to its plan. */
export function isEntitled(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
