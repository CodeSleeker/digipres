import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CustomerService } from "@/services/customer-service";
import { CustomerRepository } from "@/repositories/customer-repository";
import { BusinessError } from "@/services/business-service";
import type { CustomerListQuery } from "@/types/customer";
import type { Database } from "@/types/database";

/**
 * Tenant-isolation tests for the APPLICATION layer (defense-in-depth on top of
 * Postgres RLS, which is proven separately in tests/db/rls.integration.test.ts).
 *
 * Services are business-scoped: the caller resolves which tenant is being acted
 * on and passes its id. These tests verify the service never widens that scope,
 * and that a cross-tenant mutation is refused before it ever reaches the DB.
 */

const query: CustomerListQuery = { page: 1, pageSize: 20 };

describe("customer service — business scoping", () => {
  it("issues every query against exactly the businessId it was given", async () => {
    const list = vi.fn(async () => ({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      pageCount: 1,
    }));
    const findById = vi.fn(async () => null);
    const service = new CustomerService({
      list,
      findById,
    } as unknown as CustomerRepository);

    await service.list("biz-A", query);
    await service.get("biz-A", "cust-1");

    expect(list).toHaveBeenCalledWith("biz-A", query);
    expect(findById).toHaveBeenCalledWith("biz-A", "cust-1");
  });

  it("refuses to update a customer that doesn't belong to this business", async () => {
    // findById is business-scoped, so another tenant's customer reads as absent.
    const findById = vi.fn(async () => null);
    const update = vi.fn();
    const service = new CustomerService({
      findById,
      update,
    } as unknown as CustomerRepository);

    await expect(
      service.update("biz-A", "cust-of-biz-B", { name: "hijack" }),
    ).rejects.toBeInstanceOf(BusinessError);

    expect(update).not.toHaveBeenCalled(); // never reaches the database
  });
});

/* --- Repository-level query scoping -------------------------------------- */

type QueryResult = { data: unknown[]; error: null; count: number };

interface Recorder {
  table?: string;
  eq: [string, unknown][];
  is: [string, unknown][];
}

/** Minimal chainable stand-in that records the filters a query applies. */
function makeSupabaseRecorder(): {
  client: SupabaseClient<Database>;
  calls: Recorder;
} {
  const calls: Recorder = { eq: [], is: [] };
  const result: QueryResult = { data: [], error: null, count: 0 };
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      calls.eq.push([col, val]);
      return builder;
    },
    is: (col: string, val: unknown) => {
      calls.is.push([col, val]);
      return builder;
    },
    or: () => builder,
    order: () => builder,
    range: () => Promise.resolve(result),
    then: (res: (v: QueryResult) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  const client = {
    from: (table: string) => {
      calls.table = table;
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("tenant isolation — repository query scoping", () => {
  it("filters the customer list by business_id and active rows", async () => {
    const { client, calls } = makeSupabaseRecorder();
    const repo = new CustomerRepository(client);

    await repo.list("biz-A", query);

    expect(calls.table).toBe("customers");
    expect(calls.eq).toContainEqual(["business_id", "biz-A"]);
    expect(calls.is).toContainEqual(["deleted_at", null]);
  });
});
