import { logError } from "@/lib/observability/logger";

/**
 * The Meta Send API — how the Page talks back.
 *
 * Three calls, deliberately in this order: mark the message seen, show the
 * typing indicator, then send. A reply that appears instantly with no read
 * receipt reads as a machine; the two cheap calls before it are most of what
 * makes the exchange feel like a person, and they cost nothing but latency
 * the customer is already waiting through.
 *
 * Every call is best-effort and never throws. This runs AFTER the webhook has
 * acknowledged — there is no request left to fail, and an exception here would
 * only crash a background task. Failures are logged.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v23.0";

/** Meta's own cap. Longer text is refused outright rather than truncated by them. */
export const MESSENGER_MAX_CHARS = 2000;

type SenderAction = "mark_seen" | "typing_on" | "typing_off";

async function post(
  pageToken: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(pageToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) return true;

    // Meta's body names the real problem — an expired token, a closed 24-hour
    // window, a Page the app lost access to. The status alone doesn't.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    logError(new Error(`Send API ${res.status}: ${detail}`), {
      scope: "messenger:send",
    });
    return false;
  } catch (error) {
    logError(error, { scope: "messenger:send" });
    return false;
  }
}

/** Read receipts and the typing indicator. */
export function sendAction(
  pageToken: string,
  psid: string,
  action: SenderAction,
): Promise<boolean> {
  return post(pageToken, {
    recipient: { id: psid },
    sender_action: action,
  });
}

/**
 * Send one text message.
 *
 * `messaging_type: "RESPONSE"` is the honest tag: this is a reply to something
 * the customer just sent, which is exactly what Meta's 24-hour window permits.
 * Tagging it as anything else to escape that window is against platform policy
 * and is how a Page loses messaging access.
 */
export async function sendText(
  pageToken: string,
  psid: string,
  text: string,
): Promise<boolean> {
  const body = text.trim();
  if (!body) return false;

  return post(pageToken, {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: body.slice(0, MESSENGER_MAX_CHARS) },
  });
}

/**
 * The full reply gesture: seen, typing, pause, send.
 *
 * The pause is proportional to reply length and capped hard. Without it the
 * typing indicator flashes for a few milliseconds and is worse than not sending
 * one; with an uncapped one, a long answer leaves someone watching dots for ten
 * seconds. Skipped entirely under test, where a real delay is just a slow suite.
 */
export async function replyWithPresence(
  pageToken: string,
  psid: string,
  text: string,
  { typingDelayMs }: { typingDelayMs?: number } = {},
): Promise<boolean> {
  await sendAction(pageToken, psid, "mark_seen");
  await sendAction(pageToken, psid, "typing_on");

  const delay = typingDelayMs ?? typingDelayFor(text);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  return sendText(pageToken, psid, text);
}

/** ~45 words per minute of apparent typing, floored at 0.6s and capped at 4s. */
export function typingDelayFor(text: string): number {
  const ms = Math.round(text.length * 22);
  return Math.min(Math.max(ms, 600), 4000);
}
