import type {
  ConversationStateEnum,
  MessageDirectionEnum,
  MessagingChannelKindEnum,
  MessagingChannelStatusEnum,
} from "./database";

export type MessagingChannelKind = MessagingChannelKindEnum;
export type MessagingChannelStatus = MessagingChannelStatusEnum;
export type ConversationState = ConversationStateEnum;
export type MessageDirection = MessageDirectionEnum;

/**
 * A connected Page.
 *
 * The encrypted token is deliberately NOT on this shape. Nothing that renders,
 * logs or serializes a channel has any use for it, and the surest way to keep a
 * credential out of a log line is to keep it out of the object that gets
 * logged. Fetch it explicitly when a send actually needs it.
 */
export interface MessagingChannel {
  id: string;
  pageId: string;
  pageName: string | null;
  /** Null for the platform's own Page — see the check constraint in 0040. */
  businessId: string | null;
  kind: MessagingChannelKind;
  aiEnabled: boolean;
  status: MessagingChannelStatus;
}

/** One reply the bot sent, with the cost of producing it. */
export interface OutboundMessage {
  conversationId: string;
  text: string;
  /** The model that wrote it — null for anything a human sent. */
  model: string | null;
  tokens: number | null;
  latencyMs: number | null;
}

/** One inbound message, already resolved to its thread. */
export interface InboundMessage {
  conversationId: string;
  /** Meta's message id — the dedupe key. */
  mid: string | null;
  text: string | null;
  /** The raw messaging event, kept for attachments and postbacks. */
  payload: unknown;
}

/**
 * The slice of Meta's webhook payload this phase reads.
 *
 * Deliberately partial and every field optional: the payload carries events we
 * don't handle yet (reads, delivery receipts, handovers), and a strict shape
 * would reject a delivery for containing something new rather than skipping it.
 */
export interface MessengerWebhookBody {
  object?: string;
  entry?: MessengerEntry[];
}

export interface MessengerEntry {
  /** The PAGE id. This, and only this, decides which tenant a delivery is for. */
  id?: string;
  time?: number;
  messaging?: MessagingEvent[];
}

export interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: unknown[];
  };
  postback?: { title?: string; payload?: string };
}
