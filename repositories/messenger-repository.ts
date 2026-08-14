import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  MessagingChannel,
  InboundMessage,
} from "@/types/messenger";

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
