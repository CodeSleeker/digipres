import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Hiding a nav link is presentation. These tests assert the *enforcement*:
 * a business without a capability is refused when it asks for it directly —
 * by URL (pages) or by POSTing a server action.
 */

const redirectSpy = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectSpy(url),
}));

const { requireFeature, featureError } = await import("@/lib/features/guard");

const BUSINESS = "biz-1";

const STARTER_PLAN = {
  id: "plan-starter",
  code: "starter",
  name: "Starter",
  price_cents: 0,
  interval: "month",
  is_default: true,
  // Starter excludes the paid capabilities.
  features: {
    appointments: true,
    reviews: true,
    analytics: true,
    ai_messages: false,
    custom_domains: false,
  },
};

type Tables = {
  plans: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  business_features: Record<string, unknown>[];
};

/**
 * Minimal PostgREST stand-in: enough of the builder for
 * SubscriptionRepository's reads, so the real entitlement resolution runs.
 */
function fakeSupabase(tables: Partial<Tables>): SupabaseClient<Database> {
  const data: Tables = {
    plans: tables.plans ?? [],
    subscriptions: tables.subscriptions ?? [],
    business_features: tables.business_features ?? [],
  };

  const builder = (table: keyof Tables) => {
    let rows = [...data[table]];
    const api = {
      select: () => api,
      order: () => api,
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return api;
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      // `await builder` — used by overridesFor.
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: rows, error: null }),
    };
    return api;
  };

  return {
    from: (table: keyof Tables) => builder(table),
  } as unknown as SupabaseClient<Database>;
}

/** No subscription row: everyone falls back to the default plan. */
const onStarter = () => fakeSupabase({ plans: [STARTER_PLAN] });

/** Starter plan, but this business bought the add-on. */
const withOverride = (feature: string, enabled: boolean) =>
  fakeSupabase({
    plans: [STARTER_PLAN],
    business_features: [
      { business_id: BUSINESS, feature_key: feature, enabled },
    ],
  });

beforeEach(() => {
  redirectSpy.mockClear();
});

describe("pages: a feature you don't have is not reachable by URL", () => {
  it("redirects to /admin with the reason when the plan excludes it", async () => {
    await expect(
      requireFeature(onStarter(), BUSINESS, "ai_messages"),
    ).rejects.toThrow("REDIRECT:/admin?unavailable=ai_messages");
  });

  it("lets an included feature through", async () => {
    await expect(
      requireFeature(onStarter(), BUSINESS, "appointments"),
    ).resolves.toBeUndefined();
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("redirects when there is no business at all", async () => {
    await expect(
      requireFeature(onStarter(), null, "appointments"),
    ).rejects.toThrow("REDIRECT:/admin");
  });

  it("honours a per-business grant over the plan", async () => {
    await expect(
      requireFeature(
        withOverride("custom_domains", true),
        BUSINESS,
        "custom_domains",
      ),
    ).resolves.toBeUndefined();
  });

  it("honours a per-business revoke over the plan", async () => {
    await expect(
      requireFeature(
        withOverride("appointments", false),
        BUSINESS,
        "appointments",
      ),
    ).rejects.toThrow("REDIRECT:/admin?unavailable=appointments");
  });
});

describe("server actions: a feature you don't have is REFUSED, not just hidden", () => {
  it("refuses each capability the plan excludes", async () => {
    // The action-level gate every mutating action calls.
    expect(await featureError(onStarter(), BUSINESS, "ai_messages")).toMatch(
      /isn't included in your current plan/,
    );
    expect(await featureError(onStarter(), BUSINESS, "custom_domains")).toMatch(
      /isn't included in your current plan/,
    );
  });

  it("returns null — meaning proceed — for an included capability", async () => {
    expect(
      await featureError(onStarter(), BUSINESS, "appointments"),
    ).toBeNull();
    expect(await featureError(onStarter(), BUSINESS, "reviews")).toBeNull();
  });

  it("never redirects: an action must return, not navigate", async () => {
    await featureError(onStarter(), BUSINESS, "ai_messages");
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("refuses when there is no business", async () => {
    expect(await featureError(onStarter(), null, "appointments")).toMatch(
      /business profile/,
    );
  });

  it("refuses a revoked capability even though the plan includes it", async () => {
    expect(
      await featureError(withOverride("reviews", false), BUSINESS, "reviews"),
    ).toMatch(/isn't included/);
  });
});

describe("billing outage degrades safely", () => {
  it("falls back to code defaults when the billing tables are unreadable", async () => {
    const broken = {
      from: () => {
        throw new Error('relation "plans" does not exist');
      },
    } as unknown as SupabaseClient<Database>;

    // Defaults keep the core product working…
    expect(await featureError(broken, BUSINESS, "appointments")).toBeNull();
    // …but paid add-ons stay off rather than falling open.
    expect(await featureError(broken, BUSINESS, "ai_messages")).toMatch(
      /isn't included/,
    );
  });
});
