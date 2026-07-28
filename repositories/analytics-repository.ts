import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppointmentStatus } from "@/types/appointment";
import type { ReviewStatus } from "@/types/customer";
import type { ReviewMessageStatus } from "@/types/review-message";

/** Minimal appointment shape needed for the analytics aggregations. */
export interface AppointmentFact {
  customerId: string | null;
  status: AppointmentStatus;
  startsAt: string;
}

/** Cap on rows pulled for in-memory aggregation (plenty for a local business). */
const ROW_CAP = 5000;

/**
 * Read-only source rows for analytics, scoped to a business_id (RLS enforces the
 * same). Aggregation happens in the service; this layer only fetches the narrow
 * columns each chart needs. No business rules here.
 */
export class AnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Active appointments starting on/after `sinceIso`. */
  async appointmentsSince(
    businessId: string,
    sinceIso: string,
  ): Promise<AppointmentFact[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("customer_id,status,starts_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .gte("starts_at", sinceIso)
      .order("starts_at", { ascending: true })
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      customerId: r.customer_id,
      status: r.status,
      startsAt: r.starts_at,
    }));
  }

  /** created_at timestamps of active customers added on/after `sinceIso`. */
  async customerCreatedDatesSince(
    businessId: string,
    sinceIso: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("created_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .gte("created_at", sinceIso)
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? []).map((r) => r.created_at);
  }

  /** Review status of every active customer (for the review-rate breakdown). */
  async customerReviewStatuses(businessId: string): Promise<ReviewStatus[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("review_status")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? []).map((r) => r.review_status);
  }

  /** Status of every review-automation message (for the SMS-delivery breakdown). */
  async reviewMessageStatuses(
    businessId: string,
  ): Promise<ReviewMessageStatus[]> {
    const { data, error } = await this.supabase
      .from("review_messages")
      .select("status")
      .eq("business_id", businessId)
      .limit(ROW_CAP);
    if (error) throw error;
    return (data ?? []).map((r) => r.status);
  }
}
