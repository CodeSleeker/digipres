import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Enquiry } from "@/types/enquiry";

type EnquiryRow = Database["public"]["Tables"]["enquiries"]["Row"];
type EnquiryInsert = Database["public"]["Tables"]["enquiries"]["Insert"];

/**
 * Data access for enquiries, scoped to a business_id and active rows (RLS
 * enforces the same for the authenticated paths).
 */
export class EnquiryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** The inbox: newest first. */
  async list(businessId: string, limit = 100): Promise<Enquiry[]> {
    const { data, error } = await this.supabase
      .from("enquiries")
      .select("*")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }

  /**
   * How many are unread. `head: true` asks Postgres for the count and no rows —
   * this runs on every dashboard render, and fetching the bodies to length an
   * array would read the whole archive to display one number.
   */
  async unreadCount(businessId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  }

  /** The public intake. Runs with the service-role client — see the route. */
  async create(input: EnquiryInsert): Promise<Enquiry> {
    const { data, error } = await this.supabase
      .from("enquiries")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  /**
   * Mark read, once.
   *
   * `.is("read_at", null)` is not an optimisation: without it, reopening an
   * enquiry would rewrite the timestamp and lose when the owner FIRST saw it,
   * which is the only thing the column is for.
   */
  async markRead(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("enquiries")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .is("read_at", null);
    if (error) throw error;
  }

  /** Soft delete — the row stays, so a mis-click is recoverable. */
  async remove(businessId: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from("enquiries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", businessId)
      .is("deleted_at", null);
    if (error) throw error;
  }
}

function toDomain(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
