import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * The session-level start/end pair only says staff were *inside* an account.
 * These tests cover the per-mutation trail that says what they changed.
 */

const forwardedFor = { value: "203.0.113.7, 70.41.3.18" };
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) =>
      name === "x-forwarded-for" ? forwardedFor.value : null,
  }),
}));

const { auditTenantAction } = await import("@/lib/audit/tenant-audit");

const STAFF = { id: "staff-1" } as User;
const TENANT = "biz-9";

const inserts: Record<string, unknown>[] = [];

/** Captures what would be written to `audit_log`. */
function recordingClient(): SupabaseClient<Database> {
  return {
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        if (table === "audit_log") inserts.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient<Database>;
}

const staffActingAs = (supabase: SupabaseClient<Database>) => ({
  supabase,
  user: STAFF,
  businessId: TENANT,
  isImpersonating: true,
});

beforeEach(() => {
  inserts.length = 0;
  forwardedFor.value = "203.0.113.7, 70.41.3.18";
});

describe("an owner's own edits are not platform-audited", () => {
  it("writes nothing for a normal session", async () => {
    await auditTenantAction(
      {
        supabase: recordingClient(),
        user: { id: "owner-1" } as User,
        businessId: TENANT,
        isImpersonating: false,
      },
      "customer.deleted",
      { entity: "customer", entityId: "c-1" },
    );
    expect(inserts).toHaveLength(0);
  });

  it("writes nothing when there is no tenant to attribute it to", async () => {
    await auditTenantAction(
      {
        supabase: recordingClient(),
        user: STAFF,
        businessId: null,
        isImpersonating: true,
      },
      "customer.deleted",
    );
    expect(inserts).toHaveLength(0);
  });
});

describe("staff acting as a tenant leave a per-mutation trail", () => {
  it("attributes the row to the STAFF member, against the TENANT", async () => {
    await auditTenantAction(
      staffActingAs(recordingClient()),
      "customer.deleted",
      {
        entity: "customer",
        entityId: "c-1",
      },
    );

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      actor_user_id: "staff-1", // not the owner whose account this is
      acting_business_id: TENANT,
      action: "customer.deleted",
      entity: "customer",
      entity_id: "c-1",
    });
  });

  it("keeps only the first hop of x-forwarded-for", async () => {
    // The rest of the chain is supplied by the caller and cannot be trusted.
    await auditTenantAction(staffActingAs(recordingClient()), "domain.removed");
    expect(inserts[0].ip).toBe("203.0.113.7");
  });

  it("records no IP rather than a bogus one when the header is absent", async () => {
    forwardedFor.value = "";
    await auditTenantAction(staffActingAs(recordingClient()), "domain.removed");
    expect(inserts[0].ip).toBeNull();
  });

  it("carries the metadata the action supplies", async () => {
    await auditTenantAction(
      staffActingAs(recordingClient()),
      "website.section_updated",
      { metadata: { section: "hero" } },
    );
    expect(inserts[0].metadata).toEqual({ section: "hero" });
  });
});

describe("auditing never breaks the client's edit", () => {
  it("returns normally when the audit insert errors", async () => {
    const failing = {
      from: () => ({
        insert: async () => ({ error: { message: "permission denied" } }),
      }),
    } as unknown as SupabaseClient<Database>;

    await expect(
      auditTenantAction(staffActingAs(failing), "appointment.updated"),
    ).resolves.toBeUndefined();
  });

  it("returns normally when the client itself throws", async () => {
    const broken = {
      from: () => {
        throw new Error("connection refused");
      },
    } as unknown as SupabaseClient<Database>;

    await expect(
      auditTenantAction(staffActingAs(broken), "appointment.updated"),
    ).resolves.toBeUndefined();
  });
});
