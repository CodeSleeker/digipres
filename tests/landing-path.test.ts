import { describe, it, expect } from "vitest";
import {
  landingPathFor,
  PLATFORM_HOME,
  TENANT_HOME,
} from "@/lib/auth/landing-path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Where sign-in lands you. Staff used to be sent to /admin unconditionally,
 * so a super admin saw a tenant dashboard (or an empty one) and had to find
 * /platform themselves.
 */
function clientReturning(
  row: Record<string, unknown> | null,
): SupabaseClient<Database> {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("post-login destination", () => {
  it.each(["super_admin", "support", "read_only"])(
    "sends %s to the platform portal",
    async (role) => {
      const supabase = clientReturning({ user_id: "u1", role });
      await expect(landingPathFor(supabase, "u1")).resolves.toBe(PLATFORM_HOME);
    },
  );

  it("sends a tenant owner to their back office", async () => {
    await expect(
      landingPathFor(clientReturning(null), "owner-1"),
    ).resolves.toBe(TENANT_HOME);
  });

  it("falls back to the back office when the lookup fails", async () => {
    // A routing hint must never be what blocks a successful login.
    const broken = {
      from: () => {
        throw new Error("network");
      },
    } as unknown as SupabaseClient<Database>;
    await expect(landingPathFor(broken, "u1")).resolves.toBe(TENANT_HOME);
  });
});
