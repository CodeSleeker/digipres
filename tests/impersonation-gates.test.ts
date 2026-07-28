import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PlatformRole } from "@/types/platform";

/**
 * The impersonation RESOLVER — the single place that decides a request may run
 * on the SERVICE-ROLE client, with RLS out of the picture entirely.
 *
 * The token's own signing/expiry rules are covered in
 * tests/impersonation-token.test.ts. What matters here is that possession of a
 * valid token is never sufficient on its own: ALL THREE gates must hold, and
 * failing any one falls back to the actor's own tenant rather than granting
 * partial access.
 */

const STAFF = { id: "staff-1" } as User;
const TENANT = "biz-tenant";
const STAFF_OWN = "biz-staff-own";

/* --- Controls for each gate ----------------------------------------------- */
const state = {
  cookie: "token" as string | null,
  /** Gate 1: what the token verifies to (null = invalid/expired/wrong actor). */
  verifiesTo: TENANT as string | null,
  /** Gate 2: the actor's CURRENT platform role, re-read per request. */
  role: "support" as PlatformRole | null,
  /** Gate 3: does the target business still exist? */
  tenantExists: true,
  /** Whether the service-role client can be constructed at all. */
  serviceAvailable: true,
};

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/lib/auth/impersonation", () => ({
  readImpersonationCookie: async () => state.cookie,
  verifyImpersonationToken: () => state.verifiesTo,
}));

/** Rows keyed by table, for whichever client asks. */
function client(label: "user" | "service"): SupabaseClient<Database> {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          // `businesses` lookups: findById and findByOwnerId have the SAME query
          // shape, so which one this is follows from which client asked. Only
          // the service-role client is ever used to reach the tenant.
          is: () => ({
            maybeSingle: async () => ({
              data:
                label === "service"
                  ? state.tenantExists
                    ? { id: TENANT, name: "Tenant", slug: "tenant" }
                    : null
                  : { id: STAFF_OWN, name: "Staff Co", slug: "staff-co" },
              error: null,
            }),
          }),
          maybeSingle: async () => ({
            data:
              table === "platform_admins" && state.role
                ? { user_id: STAFF.id, role: state.role }
                : null,
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ supabase: client("user"), user: STAFF }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    if (!state.serviceAvailable) throw new Error("service role not configured");
    return client("service");
  },
}));

const { getOwnerContext } = await import("@/lib/tenant/business-context");

beforeEach(() => {
  state.cookie = "token";
  state.verifiesTo = TENANT;
  state.role = "support";
  state.tenantExists = true;
  state.serviceAvailable = true;
});

describe("all three gates hold", () => {
  it("resolves the TENANT, flagged as impersonating", async () => {
    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(true);
    expect(context.businessId).toBe(TENANT);
    // The acting user stays the staff member — that is who the audit blames.
    expect(context.user.id).toBe(STAFF.id);
  });
});

describe("any single gate failing revokes the whole thing", () => {
  it("gate 1 — an invalid, expired or wrong-actor token", async () => {
    state.verifiesTo = null;

    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(false);
    expect(context.businessId).toBe(STAFF_OWN); // their own tenant, not the client's
  });

  it("gate 2 — staff access revoked since the token was issued", async () => {
    // The token is still cryptographically valid; the row is gone.
    state.role = null;

    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(false);
    expect(context.businessId).not.toBe(TENANT);
  });

  it("gate 3 — the target business no longer exists", async () => {
    state.tenantExists = false;

    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(false);
    expect(context.businessId).not.toBe(TENANT);
  });

  it("no cookie at all is an ordinary session", async () => {
    state.cookie = null;

    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(false);
    expect(context.businessId).toBe(STAFF_OWN);
  });
});

describe("failure modes stay closed", () => {
  it("falls back to the actor's own context when service-role is unavailable", async () => {
    // Never silently continue on the USER's client while flagged as
    // impersonating — that would read the wrong tenant under the wrong label.
    state.serviceAvailable = false;

    const context = await getOwnerContext();
    expect(context.isImpersonating).toBe(false);
    expect(context.businessId).toBe(STAFF_OWN);
  });

  it("re-checks staff status on EVERY request, not once per session", async () => {
    expect((await getOwnerContext()).isImpersonating).toBe(true);

    state.role = null; // revoked mid-session
    expect((await getOwnerContext()).isImpersonating).toBe(false);
  });
});
