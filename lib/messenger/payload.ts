import type {
  MessagingEvent,
  MessengerWebhookBody,
} from "@/types/messenger";

/** One inbound message, flattened out of the nested webhook envelope. */
export interface InboundEvent {
  /** The PAGE id — the only thing that decides which tenant this belongs to. */
  pageId: string;
  /** Page-scoped sender id. Never a cross-Page identity. */
  psid: string;
  mid: string | null;
  text: string | null;
  /** When the customer sent it, ISO. Drives Meta's 24-hour reply window. */
  sentAt: string;
  /** The original event, kept whole for attachments and postbacks. */
  payload: MessagingEvent;
}

/**
 * Pull the inbound messages out of a webhook delivery.
 *
 * One delivery can carry several entries and each entry several events, so this
 * flattens rather than assuming the single-message shape the Meta docs use in
 * their examples.
 *
 * SKIPS, rather than rejects:
 *
 *  - ECHOES. With `message_echoes` subscribed, Meta delivers the Page's own
 *    outbound messages back. Storing those as inbound would make the bot appear
 *    to be talking to itself, and — once slot filling lands — feed its own
 *    words back in as customer input.
 *  - Events with no sender or no Page id. Unroutable by definition.
 *  - Anything that isn't a message or a postback: read receipts, delivery
 *    confirmations and handover notices are subscribed to but not handled yet,
 *    and a strict parse would fail the whole delivery over one of them.
 *
 * A partial delivery is better than a rejected one: the alternative is Meta
 * retrying an entire batch because of one event we don't understand.
 */
export function inboundEventsFrom(
  body: MessengerWebhookBody,
): InboundEvent[] {
  const events: InboundEvent[] = [];

  for (const entry of body.entry ?? []) {
    const pageId = entry.id?.trim();
    if (!pageId) continue;

    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id?.trim();
      if (!psid) continue;
      if (event.message?.is_echo) continue;

      const isMessage = Boolean(event.message);
      const isPostback = Boolean(event.postback);
      if (!isMessage && !isPostback) continue;

      events.push({
        pageId,
        psid,
        mid: event.message?.mid?.trim() || null,
        // A postback (a tapped button) has a payload but no text; its title is
        // what the customer actually saw themselves choose.
        text: event.message?.text ?? event.postback?.title ?? null,
        sentAt: timestampToIso(event.timestamp),
        payload: event,
      });
    }
  }

  return events;
}

/**
 * Meta sends epoch MILLISECONDS. A missing or nonsensical value falls back to
 * now rather than to 1970 — this drives the 24-hour reply window, and an epoch
 * date would silently mark every thread as expired.
 */
function timestampToIso(timestamp: number | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return new Date().toISOString();
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
