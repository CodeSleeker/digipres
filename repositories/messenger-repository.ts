import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  MessagingChannel,
  InboundMessage,
  OutboundMessage,
} from "@/types/messenger";
import { decryptPageToken, encryptPageToken } from "@/lib/messenger/token-crypto";

type ChannelRow = Database["public"]["Tables"]["messaging_channels"]["Row"];

/**
 * Data access for Messenger, driven by the webhook.
 *
 * Every method here runs with the SERVICE-ROLE client. A delivery arrives with
 * no session — it is authenticated by Meta's signature, not by a logged-in user
 * — so RLS has no identity to evaluate and the tables carry read-only policies
 * for exactly that reason (migration 0040). Tenancy is resolved here instead,
 * from the Page id in the payload.
 */
export class MessengerRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * The channel for a Page, or null when that Page isn't connected.
   *
   * Null is a normal outcome, not an error: Meta will deliver for any Page the
   * app is subscribed to, including one connected in the dashboard but never
   * recorded here. The caller acknowledges and drops it.
   */
  async findChannelByPageId(pageId: string): Promise<MessagingChannel | null> {
    const { data, error } = await this.supabase
      .from("messaging_channels")
      .select("*")
      .eq("page_id", pageId)
      .maybeSingle();
    if (error) throw error;
    return data ? toChannel(data) : null;
  }

  /**
   * The thread for this person on this Page, created on first contact.
   *
   * Upsert rather than select-then-insert: two messages arriving together — a
   * text and its attachment are separate deliveries — would otherwise race and
   * one would fail the (channel_id, psid) unique constraint. `ignoreDuplicates`
   * is false so the returning row is populated either way.
   */
  async ensureConversation(
    channelId: string,
    psid: string,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("conversations")
      .upsert(
        { channel_id: channelId, psid },
        { onConflict: "channel_id,psid", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  /**
   * Record an inbound message.
   *
   * Returns false when this `mid` is already stored — a redelivery, which Meta
   * does routinely. The unique index is the arbiter rather than a prior SELECT,
   * because the duplicate arrives from a RETRY and therefore concurrently with
   * the original by definition.
   *
   * 23505 is Postgres's unique_violation. Anything else is a real failure and
   * is thrown, so the caller can log it — but see the route: the delivery is
   * still acknowledged, because a 500 makes Meta retry a message we already
   * failed to store once.
   */
  async recordInbound(message: InboundMessage): Promise<boolean> {
    const { error } = await this.supabase.from("messenger_messages").insert({
      conversation_id: message.conversationId,
      direction: "inbound",
      mid: message.mid,
      text: message.text,
      payload: message.payload as Json,
    });

    if (!error) return true;
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }

  /**
   * Stamp the moment the customer last wrote.
   *
   * Not a statistic: Meta only permits a Page to message someone within 24
   * hours of THEIR last message, so this value decides whether a reply may be
   * sent at all. Written on every inbound message, including ones deduped away
   * — a redelivery still proves the customer wrote at that time.
   */
  async touchCustomerActivity(
    conversationId: string,
    at: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("conversations")
      .update({ last_customer_message_at: at })
      .eq("id", conversationId);
    if (error) throw error;
  }

  /**
   * The recent transcript for a thread, oldest first.
   *
   * Fetched newest-first and reversed rather than ordered ascending with an
   * offset: "the last N messages" is what a reply needs, and an ascending query
   * would have to count the whole thread to find where N from the end begins.
   */
  async recentTurns(
    conversationId: string,
    limit: number,
  ): Promise<{ role: "customer" | "assistant"; text: string }[]> {
    const { data, error } = await this.supabase
      .from("messenger_messages")
      .select("direction,text,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data ?? [])
      .reverse()
      .filter((row) => Boolean(row.text?.trim()))
      .map((row) => ({
        role: row.direction === "inbound" ? ("customer" as const) : ("assistant" as const),
        text: row.text as string,
      }));
  }

  /** Record a message the bot sent, so it becomes context for the next turn. */
  async recordOutbound(message: OutboundMessage): Promise<void> {
    const { error } = await this.supabase.from("messenger_messages").insert({
      conversation_id: message.conversationId,
      direction: "outbound",
      text: message.text,
      ai_model: message.model,
      tokens: message.tokens,
      latency_ms: message.latencyMs,
    });
    if (error) throw error;
  }

  /**
   * The Page token for sending, decrypted.
   *
   * Fetched on its own rather than carried on `MessagingChannel`, so the
   * credential only exists in memory when a send is actually about to happen —
   * and can never be logged by something that dumps a channel object.
   */
  async pageTokenFor(channelId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("messaging_channels")
      .select("page_access_token_encrypted")
      .eq("id", channelId)
      .maybeSingle();
    if (error) throw error;

    const stored = data?.page_access_token_encrypted;
    if (!stored) return null;
    return decryptPageToken(stored);
  }

  /** Store (or rotate) a Page token, encrypted at rest. */
  async setPageToken(pageId: string, token: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("messaging_channels")
      .update({
        page_access_token_encrypted: encryptPageToken(token),
        connected_at: new Date().toISOString(),
      })
      .eq("page_id", pageId)
      .select("id");
    if (error) throw error;
    return (data ?? []).length > 0;
  }

  /** The person this thread belongs to — the address a reply is sent to. */
  async psidFor(conversationId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("psid")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw error;
    return data?.psid ?? null;
  }

  /** Count the AI turns so far, for the per-conversation cap. */
  async bumpAiCount(conversationId: string, current: number): Promise<void> {
    const { error } = await this.supabase
      .from("conversations")
      .update({ ai_message_count: current + 1 })
      .eq("id", conversationId);
    if (error) throw error;
  }
}

function toChannel(row: ChannelRow): MessagingChannel {
  return {
    id: row.id,
    pageId: row.page_id,
    pageName: row.page_name,
    businessId: row.business_id,
    kind: row.channel_kind,
    aiEnabled: row.ai_enabled,
    status: row.status,
  };
}
