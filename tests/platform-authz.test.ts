import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlatformRole } from "@/types/platform";

/**
 * Authorization for the /platform plane.
 *
 * The portal reads and writes across EVERY tenant, so these guards are the
 * boundary between "one client's back office" and "all of them". They must
 * re-check the database on each request — never trust a cookie, a session
 * claim, or the fact that a user reached a URL.
 */

const STAFF_USER = { id: "staff-1" } as User;

const redirectSpy = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectSpy(url),
}));

/** The row `platform_admins` returns for the acting user (null = not staff). */
const adminRow: { value: { user_id: string; role: PlatformRole } | null } = {
  value: null,
};
let lookups = 0;

const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          lookups += 1;
          return { data: adminRow.value, error: null };
        },
      }),
    }),
  }),
} as unknown as SupabaseClient<Database>;

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ supabase, user: STAFF_USER }),
}));

const {
  requirePlatformAdmin,
  requireSuperAdmin,
  requirePlatformWriter,
  getPlatformRole,
} = await import("@/lib/auth/require-platform-admin");

const asRole = (role: PlatformRole) => {
  adminRow.value = { user_id: STAFF_USER.id, role };
};
const asNotStaff = () => {
  adminRow.value = null;
};

beforeEach(() => {
  redirectSpy.mockClear();
  lookups = 0;
  asNotStaff();
});

describe("requirePlatformAdmin — is this user staff at all?", () => {
  it("sends a signed-in tenant owner to their own back office", async () => {
    await expect(requirePlatformAdmin()).rejects.toThrow("REDIRECT:/admin");
  });

  it.each(["super_admin", "read_only", "support"] as PlatformRole[])(
    "admits %s and reports the role",
    async (role) => {
      asRole(role);
      await expect(requirePlatformAdmin()).resolves.toMatchObject({ role });
    },
  );

  it("re-reads the database on every call", async () => {
    asRole("super_admin");
    await requirePlatformAdmin();
    await requirePlatformAdmin();
    // Revoking staff access must take effect immediately, not at next login.
    expect(lookups).toBe(2);
  });

  it("stops admitting a user the moment their row is revoked", async () => {
    asRole("support");
    await expect(requirePlatformAdmin()).resolves.toMatchObject({
      role: "support",
    });

    asNotStaff();
    await expect(requirePlatformAdmin()).rejects.toThrow("REDIRECT:/admin");
  });
});

describe("requireSuperAdmin — platform-wide changes", () => {
  it("admits only super_admin", async () => {
    asRole("super_admin");
    await expect(requireSuperAdmin()).resolves.toMatchObject({
      role: "super_admin",
    });
  });

  it.each(["support", "read_only"] as PlatformRole[])(
    "refuses %s, sending them back to the portal",
    async (role) => {
      asRole(role);
      await expect(requireSuperAdmin()).rejects.toThrow("REDIRECT:/platform");
    },
  );

  it("refuses a non-staff user before the role is ever considered", async () => {
    await expect(requireSuperAdmin()).rejects.toThrow("REDIRECT:/admin");
  });
});

describe("requirePlatformWriter — who may change a client's data", () => {
  it.each(["super_admin", "support"] as PlatformRole[])(
    "admits %s",
    async (role) => {
      asRole(role);
      await expect(requirePlatformWriter()).resolves.toMatchObject({ role });
    },
  );

  it("refuses read_only — they can look, not act", async () => {
    // This is the guard on impersonation: read_only staff cannot act as a client.
    asRole("read_only");
    await expect(requirePlatformWriter()).rejects.toThrow("REDIRECT:/platform");
  });
});

describe("getPlatformRole — conditional UI only", () => {
  it("returns null for a non-staff user instead of redirecting", async () => {
    await expect(getPlatformRole()).resolves.toBeNull();
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("returns the role for staff", async () => {
    asRole("read_only");
    await expect(getPlatformRole()).resolves.toBe("read_only");
  });
});
