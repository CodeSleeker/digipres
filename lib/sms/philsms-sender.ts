import type { SmsSender, SmsSendOptions, SmsSendResult } from "./sender";

/**
 * PhilSMS-backed SmsSender. Speaks their REST API over plain fetch, same as the
 * Twilio sender — one HTTP call doesn't justify an SDK.
 *
 * POST https://dashboard.philsms.com/api/v3/sms/send
 *   { recipient, sender_id, type: "plain", message }
 *
 * The interesting difference from Twilio is the SENDER ID. Twilio originates
 * from a number you own, so the tenant can't influence it. PhilSMS originates
 * from an alphanumeric label, which is exactly the per-tenant branding this
 * platform wants — the customer sees "RoniesBarber", not a shortcode.
 */
export interface PhilSmsConfig {
  apiToken: string;
  /**
   * A fixed sender ID applied to EVERY message, ignoring the per-tenant name.
   *
   * Set it while only one label is approved (e.g. "PhilSMS"). Leave it blank to
   * go dynamic: each message is then sent under the business it belongs to.
   */
  senderId?: string;
}

const ENDPOINT = "https://dashboard.philsms.com/api/v3/sms/send";

/**
 * Alphanumeric sender IDs are capped at 11 characters by the GSM standard, and
 * the carrier silently truncates or rejects anything longer — so do it here,
 * predictably, where the result can be reasoned about.
 *
 * Whole words are preferred over a hard cut: "Ronie's Barber" becomes "Ronies"
 * rather than "Ronies Barb". A name that doesn't fit is better shortened at a
 * boundary a human chose than mid-syllable.
 *
 * Returns null when nothing usable survives, so the caller falls back rather
 * than sending an empty sender_id.
 */
export function normalizeSenderId(raw: string): string | null {
  const cleaned = raw
    // Only letters, digits and spaces survive; apostrophes, "&" and accents are
    // the common rejections.
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length <= 11) return cleaned;

  const words = cleaned.split(" ");
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 11) break;
    out = next;
  }

  // A single first word longer than the limit still has to be cut somewhere.
  return out || words[0]!.slice(0, 11);
}

/**
 * PhilSMS expects a bare international number ("639977436111"), not E.164 with
 * the leading "+". Numbers are stored here in E.164, so strip it on the way out
 * rather than storing a second format.
 */
export function philSmsRecipient(to: string): string {
  return to.trim().replace(/^\+/, "");
}

export class PhilSmsSender implements SmsSender {
  constructor(private readonly config: PhilSmsConfig) {}

  async send(
    to: string,
    body: string,
    options?: SmsSendOptions,
  ): Promise<SmsSendResult> {
    // A configured sender ID WINS over the per-tenant name. It exists precisely
    // for the case where only one label is approved with the carrier, so a
    // business name must not be able to override it into a rejected send.
    const senderId =
      normalizeSenderId(this.config.senderId ?? "") ??
      normalizeSenderId(options?.senderId ?? "");

    if (!senderId) {
      // Failing loudly beats posting an empty sender_id and reading the
      // carrier's error later: nothing here is recoverable at runtime.
      return {
        success: false,
        error:
          "PhilSMS: no sender ID — set PHILSMS_SENDER_ID or pass the business name.",
      };
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          recipient: philSmsRecipient(to),
          sender_id: senderId,
          type: "plain",
          message: body,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        data?: { uid?: string };
      };

      if (!res.ok || data.status === "error") {
        // Logged in full server-side; the returned summary is what reaches the
        // message row, so keep it short and free of the token.
        console.error(
          "[sms:philsms] %s %o",
          res.status,
          String(data.message ?? "").slice(0, 300),
        );
        return {
          success: false,
          error: data.message
            ? `PhilSMS ${res.status}: ${data.message}`
            : `PhilSMS request failed (HTTP ${res.status})`,
        };
      }

      return { success: true, providerMessageId: data.data?.uid };
    } catch (error) {
      console.error("[sms:philsms]", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "PhilSMS unreachable",
      };
    }
  }
}

/**
 * Build a PhilSmsConfig from env, or null when the token is missing.
 *
 * Only the token is required — a blank PHILSMS_SENDER_ID is the documented way
 * to ask for per-business sender IDs, not a half-configured provider.
 */
export function philSmsConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PhilSmsConfig | null {
  const apiToken = env.PHILSMS_API_TOKEN?.trim();
  if (!apiToken) return null;
  return { apiToken, senderId: env.PHILSMS_SENDER_ID?.trim() || undefined };
}
