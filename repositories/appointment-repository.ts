import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  Appointment,
  AppointmentListQuery,
  AppointmentListResult,
} from "@/types/appointment";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/schemas/appointment";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

/**
 * Data access for appointments, scoped to a business_id and active rows (RLS
 * enforces the same). Customer names are resolved with a second scoped query
 * (rather than a typed embed) and attached for display.
 */
export class AppointmentRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Paginated, status-filtered list (most recent first). */
  async list(
    businessId: string,
    query: AppointmentListQuery,
  ): Promise<AppointmentListResult> {
    const { status, page, pageSize } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .is("deleted_at", null);

    if (status) builder = builder.eq("status", status);

    const { data, error, count } = await builder
      .order("starts_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return {
      rows: await this.attachNames(businessId, data ?? []),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /** All appointments within a time range (for the calendar), earliest first. */
  async listBetween(
    businessId: string,
    startInclusive: string,
    endInclusive: string,
  ): Promise<Appointment[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .gte("starts_at", startInclusive)
      .lte("starts_at", endInclusive)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return this.attachNames(businessId, data ?? []);
  }

  async findById(
    businessId: string,
    id: string,
  ): Promise<Appointment | null> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [row] = await this.attachNames(businessId, [data]);
    return row;
  }

  async insert(
    businessId: string,
    input: CreateAppointmentInput,
  ): Promise<Appointment> {
    const row: AppointmentInsert = {
      business_id: businessId,
      customer_id: input.customerId ?? null,
      service: input.service ?? null,
      staff: input.staff ?? null,
      status: input.status,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      notes: input.notes ?? null,
    };
    const { data, error } = await this.supabase
      .from("appointments")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    const [created] = await this.attachNames(businessId, [data]);
    return created;
  }

  async update(
    businessId: string,
    id: string,
    input: UpdateAppointmentInput,
  ): Promise<Appointment> {
    const patch: AppointmentUpdate = {};
    if (input.customerId !== undefined)
      patch.customer_id = input.customerId ?? null;
    if (input.service !== undefined) patch.service = input.service ?? null;
    if (input.staff !== undefined) patch.staff = input.staff ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
    if (input.endsAt !== undefined) patch.ends_at = input.endsAt ?? null;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;

    const { data, error } = await this.supabase
      .from("appointments")
      .update(patch)
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw error;
    const [updated] = await this.attachNames(businessId, [data]);
    return updated;
  }

  async softDelete(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("appointments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
  }

  private async attachNames(
    businessId: string,
    rows: AppointmentRow[],
  ): Promise<Appointment[]> {
    const ids = [
      ...new Set(
        rows
          .map((r) => r.customer_id)
          .filter((v): v is string => Boolean(v)),
      ),
    ];

    const nameById = new Map<string, string>();
    if (ids.length) {
      const { data, error } = await this.supabase
        .from("customers")
        .select("id,name")
        .eq("business_id", businessId)
        .in("id", ids);
      if (error) throw error;
      for (const c of data ?? []) nameById.set(c.id, c.name);
    }

    return rows.map((row) =>
      toDomain(
        row,
        row.customer_id ? (nameById.get(row.customer_id) ?? null) : null,
      ),
    );
  }
}

function toDomain(
  row: AppointmentRow,
  customerName: string | null,
): Appointment {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName,
    service: row.service,
    staff: row.staff,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
