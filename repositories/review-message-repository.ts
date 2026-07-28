import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  NewReviewMessage,
  ReviewMessage,
  ReviewMessageListQuery,
  ReviewMessageListResult,
} from "@/types/review-message";

type Row = Database["public"]["Tables"]["review_messages"]["Row"];
type Insert = Database["public"]["Tables"]["review_messages"]["Insert"];

/**
 * Data access for review-automation messages. Reads and cancels take an explicit
 * businessId; only the scheduled processor claims across every tenant. Update
 * helpers act by id on rows already claimed under a known scope.
 */
export class ReviewMessageRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async existsForAppointment(
    businessId: string,
    appointmentId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("review_messages")
      .select("id")
      .eq("business_id", businessId)
      .eq("appointment_id", appointmentId)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  async insertMany(messages: NewReviewMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const rows: Insert[] = messages.map((m) => ({
      business_id: m.businessId,
      customer_id: m.customerId,
      appointment_id: m.appointmentId,
      step: m.step,
      body: m.body,
      to_mobile: m.toMobile,
      customer_name: m.customerName,
      scheduled_at: m.scheduledAt,
    }));
    const { error } = await this.supabase.from("review_messages").insert(rows);
    if (error) throw error;
  }

  /**
   * Atomically claim up to `limit` due, queued messages and return them already
   * marked (claimed_at set). Backed by the DB function in migration 0008, which
   * uses `FOR UPDATE SKIP LOCKED` so concurrent processors receive disjoint
   * rows — a message is therefore claimed, and sent, at most once.
   *
   * @param businessId Null claims across every tenant — correct only for the
   *   scheduler. Anything acting for one tenant must pass its id: under
   *   impersonation the client is service-role, so RLS will not narrow this.
   */
  async claimDue(
    nowIso: string,
    limit: number,
    businessId: string | null = null,
  ): Promise<ReviewMessage[]> {
    const { data, error } = await this.supabase.rpc(
      "claim_due_review_messages",
      { p_now: nowIso, p_limit: limit, p_business_id: businessId },
    );
    if (error) throw error;
    return (data ?? []).map(toDomain);
  }

  async markSent(
    id: string,
    attempts: number,
    providerMessageId: string | null,
  ): Promise<void> {
    await this.patch(id, {
      status: "sent",
      sent_at: new Date().toISOString(),
      attempts,
      provider_message_id: providerMessageId,
      last_error: null,
    });
  }

  /** Keep the message queued for another attempt at a later time. */
  async reschedule(
    id: string,
    attempts: number,
    scheduledAt: string,
    lastError: string | null,
  ): Promise<void> {
    await this.patch(id, {
      status: "queued",
      attempts,
      scheduled_at: scheduledAt,
      last_error: lastError,
      claimed_at: null, // release the claim so it can be re-claimed when due
    });
  }

  async markFailed(
    id: string,
    attempts: number,
    lastError: string | null,
  ): Promise<void> {
    await this.patch(id, { status: "failed", attempts, last_error: lastError });
  }

  async markDelivered(id: string): Promise<void> {
    await this.patch(id, {
      status: "delivered",
      delivered_at: new Date().toISOString(),
    });
  }

  /** Cancel every still-queued message for a customer; returns how many. */
  async cancelPending(businessId: string, customerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("review_messages")
      .update({ status: "cancelled" })
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("status", "queued")
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  }

  async list(
    businessId: string,
    query: ReviewMessageListQuery,
  ): Promise<ReviewMessageListResult> {
    const { status, page, pageSize } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabase
      .from("review_messages")
      .select("*", { count: "exact" })
      .eq("business_id", businessId);
    if (status) builder = builder.eq("status", status);

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

  private async patch(
    id: string,
    patch: Database["public"]["Tables"]["review_messages"]["Update"],
  ): Promise<void> {
    const { error } = await this.supabase
      .from("review_messages")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
  }
}

function toDomain(row: Row): ReviewMessage {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    appointmentId: row.appointment_id,
    step: row.step,
    status: row.status,
    body: row.body,
    toMobile: row.to_mobile,
    customerName: row.customer_name,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    attempts: row.attempts,
    lastError: row.last_error,
    providerMessageId: row.provider_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
