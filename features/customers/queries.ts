import { getOwnerContext } from "@/lib/tenant/business-context";
import { CustomerRepository } from "@/repositories/customer-repository";
import { CustomerService } from "@/services/customer-service";
import type { Customer, CustomerListResult } from "@/types/customer";
import type { CustomerListQueryInput } from "@/schemas/customer";

/**
 * Server-side read helpers for the customers pages (not Server Actions — they
 * are only ever called from Server Components). The tenant is resolved once
 * here; the service is business-scoped.
 */
const EMPTY = (query: CustomerListQueryInput): CustomerListResult => ({
  rows: [],
  total: 0,
  page: query.page,
  pageSize: query.pageSize,
  pageCount: 1,
});

export async function getCustomers(
  query: CustomerListQueryInput,
): Promise<CustomerListResult> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return EMPTY(query);
  return new CustomerService(new CustomerRepository(supabase)).list(
    businessId,
    query,
  );
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return null;
  return new CustomerService(new CustomerRepository(supabase)).get(
    businessId,
    id,
  );
}
