import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ReviewStatus } from "@/types/customer";
import type { RecentCustomer } from "@/types/dashboard";

/**
 * Read-only aggregation queries for the admin dashboard, scoped to a
 * business_id (RLS enforces the same boundary). Uses head+exact count requests
 * so each metric is a cheap COUNT — no rows transferred except the small recent
 * list. No business rules here.
 */
export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** Active, non-cancelled appointments starting within [startIso, endIso]. */
  async countAppointmentsBetween(
    businessId: string,
    startIso: string,
    endIso: string,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .gte("starts_at", startIso)
      .lte("starts_at", endIso);
    if (error) throw error;
    return count ?? 0;
  }

  /** Total active customers. */
  async countCustomers(businessId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null);
    if (error) throw error;
    return count ?? 0;
  }

  /** Active customers in a given review status. */
  async countCustomersByReviewStatus(
    businessId: string,
    status: ReviewStatus,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .eq("review_status", status);
    if (error) throw error;
    return count ?? 0;
  }

  /** Review-automation messages that reached the carrier (sent or delivered). */
  async countMessagesSent(businessId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("review_messages")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", ["sent", "delivered"]);
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Messages still waiting to go out (queued, including rescheduled retries).
   *
   * Pairs with countMessagesSent so the dashboard can say what the sent number
   * leaves out: a campaign runs over eight days, so "1 sent" on its own can't
   * distinguish "just started" from "finished".
   */
  async countMessagesQueued(businessId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("review_messages")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "queued");
    if (error) throw error;
    return count ?? 0;
  }

  /** The most recently added active customers (newest first). */
  async recentCustomers(
    businessId: string,
    limit: number,
  ): Promise<RecentCustomer[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,name,review_status,last_visit,created_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      reviewStatus: row.review_status,
      lastVisit: row.last_visit,
      createdAt: row.created_at,
    }));
  }
}
