import { describe, it, expect } from "vitest";
import { BusinessRepository } from "@/repositories/business-repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * `status` gates whether a tenant is served publicly. Before this it was a
 * column nothing read — set a business to `suspended` and its site kept right
 * on serving. These lock in the two halves of the rule:
 *   - the PUBLIC lookup resolves only `active`
 *   - owner/staff lookups ignore status, so the back office can still explain
 *     the state rather than pretending the business vanished.
 */

interface Recorder {
  table?: string;
  eq: [string, unknown][];
  is: [string, unknown][];
  updated?: Record<string, unknown>;
}

function recorder(row: Record<string, unknown> | null = null): {
  client: SupabaseClient<Database>;
  calls: Recorder;
} {
  const calls: Recorder = { eq: [], is: [] };
  const builder = {
    select: () => builder,
    update: (patch: Record<string, unknown>) => {
      calls.updated = patch;
      return builder;
    },
    eq: (column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    },
    is: (column: string, value: unknown) => {
      calls.is.push([column, value]);
      return builder;
    },
    maybeSingle: async () => ({ data: row, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: null }),
  };
  const client = {
    from: (table: string) => {
      calls.table = table;
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("public tenant lookup respects status", () => {
  it("filters to active businesses only", async () => {
    const { client, calls } = recorder();
    await new BusinessRepository(client).findBySlug("ronies");

    expect(calls.table).toBe("businesses");
    expect(calls.eq).toContainEqual(["slug", "ronies"]);
    // The rule that makes suspension real:
    expect(calls.eq).toContainEqual(["status", "active"]);
    expect(calls.is).toContainEqual(["deleted_at", null]);
  });

  it("returns null for a suspended tenant, so the site 404s", async () => {
    // The DB filter yields no row; the caller treats that as "unknown slug".
    const { client } = recorder(null);
    await expect(
      new BusinessRepository(client).findBySlug("suspended-co"),
    ).resolves.toBeNull();
  });
});

describe("owner and staff lookups ignore status", () => {
  it("findById does NOT filter by status", async () => {
    const { client, calls } = recorder();
    await new BusinessRepository(client).findById("biz-1");

    // Staff must be able to open a suspended business to fix it, and the owner
    // must be able to see why their dashboard is unavailable.
    expect(calls.eq.map(([column]) => column)).not.toContain("status");
  });

  it("findByOwnerId does NOT filter by status", async () => {
    const { client, calls } = recorder();
    await new BusinessRepository(client).findByOwnerId("owner-1");
    expect(calls.eq.map(([column]) => column)).not.toContain("status");
  });
});

describe("setStatus", () => {
  it.each(["suspended", "active"] as const)(
    "writes status=%s for the given business only",
    async (status) => {
      const { client, calls } = recorder();
      await new BusinessRepository(client).setStatus("biz-1", status);

      expect(calls.updated).toEqual({ status });
      expect(calls.eq).toContainEqual(["id", "biz-1"]);
      // Never resurrect a removed business by flipping its status.
      expect(calls.is).toContainEqual(["deleted_at", null]);
    },
  );
});

describe("soft delete", () => {
  it("stamps deleted_at and only affects a live row", async () => {
    const { client, calls } = recorder();
    await new BusinessRepository(client).softDelete("biz-1");

    expect(Object.keys(calls.updated ?? {})).toEqual(["deleted_at"]);
    expect(calls.eq).toContainEqual(["id", "biz-1"]);
    expect(calls.is).toContainEqual(["deleted_at", null]); // idempotent
  });
});

describe("suspension is presentation-independent", () => {
  it("a suspended business is still readable by id (for the notice)", async () => {
    const suspended = {
      id: "biz-1",
      owner_id: "o1",
      name: "Paused Co",
      slug: "paused",
      status: "suspended",
      hours: [],
      services_availed: [],
      onboarding: null,
    };
    const { client } = recorder(suspended);
    const business = await new BusinessRepository(client).findById("biz-1");
    expect(business?.status).toBe("suspended");
  });
});
