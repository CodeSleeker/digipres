import { describe, it, expect } from "vitest";
import {
  defaultFeatures,
  isEntitled,
  resolveFeatures,
  FEATURE_KEYS,
} from "@/lib/features/catalogue";

const STARTER = {
  appointments: true,
  reviews: true,
  analytics: true,
  ai_messages: false,
  custom_domains: false,
};

describe("feature resolution: defaults ← plan ← overrides", () => {
  it("uses code defaults with no plan or overrides", () => {
    const features = resolveFeatures(null, null);
    expect(features).toEqual(defaultFeatures());
    expect(features.ai_messages).toBe(false);
  });

  it("lets the plan override the defaults", () => {
    const features = resolveFeatures(
      { ...STARTER, ai_messages: true },
      null,
    );
    expect(features.ai_messages).toBe(true);
  });

  it("lets a per-business override beat the plan — both directions", () => {
    // Grant a capability the plan excludes…
    expect(
      resolveFeatures(STARTER, { custom_domains: true }).custom_domains,
    ).toBe(true);
    // …and revoke one it includes.
    expect(resolveFeatures(STARTER, { appointments: false }).appointments).toBe(
      false,
    );
  });

  it("ignores unknown keys, so a typo can't enable anything", () => {
    const features = resolveFeatures(
      { appointments: true, superpowers: true },
      { alsoFake: true },
    );
    expect(Object.keys(features).sort()).toEqual([...FEATURE_KEYS].sort());
    expect("superpowers" in features).toBe(false);
  });

  it("ignores non-boolean values rather than coercing them", () => {
    // A truthy string must NOT switch a feature on.
    const features = resolveFeatures(
      { ai_messages: "yes" as unknown as boolean },
      null,
    );
    expect(features.ai_messages).toBe(false);
  });

  it("always returns every known key", () => {
    const features = resolveFeatures({}, {});
    for (const key of FEATURE_KEYS) {
      expect(typeof features[key]).toBe("boolean");
    }
  });
});

describe("entitlement by subscription status", () => {
  it("entitles active and trialing", () => {
    expect(isEntitled("active")).toBe(true);
    expect(isEntitled("trialing")).toBe(true);
  });

  it("does not entitle lapsed or missing subscriptions", () => {
    expect(isEntitled("past_due")).toBe(false);
    expect(isEntitled("canceled")).toBe(false);
    expect(isEntitled(null)).toBe(false);
    expect(isEntitled(undefined)).toBe(false);
  });
});
