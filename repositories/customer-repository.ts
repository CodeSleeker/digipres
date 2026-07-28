import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  Customer,
  CustomerListQuery,
  CustomerListResult,
} from "@/types/customer";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/schemas/customer";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

/**
 * Data access for customers. Every method is scoped to a business_id (the
 * tenant key) and to active rows (deleted_at is null); RLS enforces the same
 * boundary at the database. No business rules here.
 */
export class CustomerRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Paginated, searchable, filterable list for one business. */
  async list(
    businessId: string,
    query: CustomerListQuery,
  ): Promise<CustomerListResult> {
    const { q, reviewStatus, smsStatus, page, pageSize } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .is("deleted_at", null);

    if (q) {
      const term = sanitizeSearch(q);
      if (term) {
        builder = builder.or(
          `name.ilike.%${term}%,mobile.ilike.%${term}%,email.ilike.%${term}%`,
        );
      }
    }
    if (reviewStatus) builder = builder.eq("review_status", reviewStatus);
    if (smsStatus) builder = builder.eq("sms_status", smsStatus);

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return {
      rows: (data ?? []).map(toDomain),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /** Minimal id+name list for selectors (e.g. the appointment form). */
  async listOptions(
    businessId: string,
  ): Promise<{ id: string; name: string }[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,name")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
  }

  async findById(businessId: string, id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async insert(
    businessId: string,
    input: CreateCustomerInput,
  ): Promise<Customer> {
    const row: CustomerInsert = {
      business_id: businessId,
      name: input.name,
      mobile: input.mobile ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      last_visit: input.lastVisit ?? null,
      preferred_staff: input.preferredStaff ?? null,
      services_availed: input.servicesAvailed ?? [],
      notes: input.notes ?? null,
      review_status: input.reviewStatus,
      sms_status: input.smsStatus,
      // Record consent when a contact is captured with a mobile number.
      sms_consent_at: input.mobile ? new Date().toISOString() : null,
    };
    const { data, error } = await this.supabase
      .from("customers")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /** Partial update; only provided (non-undefined) fields are written. */
  async update(
    businessId: string,
    id: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const patch: CustomerUpdate = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.mobile !== undefined) patch.mobile = input.mobile ?? null;
    if (input.email !== undefined) patch.email = input.email ?? null;
    if (input.address !== undefined) patch.address = input.address ?? null;
    if (input.lastVisit !== undefined)
      patch.last_visit = input.lastVisit ?? null;
    if (input.preferredStaff !== undefined)
      patch.preferred_staff = input.preferredStaff ?? null;
    if (input.servicesAvailed !== undefined)
      patch.services_availed = input.servicesAvailed;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;
    if (input.reviewStatus !== undefined)
      patch.review_status = input.reviewStatus;
    if (input.smsStatus !== undefined) patch.sms_status = input.smsStatus;

    const { data, error } = await this.supabase
      .from("customers")
      .update(patch)
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async softDelete(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
  }
}

/** Strip characters that would break a PostgREST `.or()` filter string. */
function sanitizeSearch(input: string): string {
  return input.replace(/[,()%*]/g, " ").trim();
}

function toDomain(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    address: row.address,
    lastVisit: row.last_visit,
    preferredStaff: row.preferred_staff,
    servicesAvailed: row.services_availed ?? [],
    notes: row.notes,
    reviewStatus: row.review_status,
    smsStatus: row.sms_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
