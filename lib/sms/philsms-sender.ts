import type { SmsSender, SmsSendOptions, SmsSendResult } from "./sender";
import { smsSegments, toGsm7 } from "./gsm7";
import { normalizeSenderId } from "./sender-id";

export { normalizeSenderId };

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
}

const ENDPOINT = "https://dashboard.philsms.com/api/v3/sms/send";

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
    // Comes from businesses.sms_sender_id and nowhere else. There is no env
    // fallback and no business-name fallback by design (migration 0028).
    const senderId = normalizeSenderId(options?.senderId ?? "");

    if (!senderId) {
      // PhilSMS requires sender_id — unlike Semaphore, it has no account-level
      // default to fall back on. Failing here, before the HTTP call, beats
      // posting an empty field and decoding the carrier's rejection later.
      return {
        success: false,
        error:
          "PhilSMS: no SMS sender ID set for this business — set one under /platform/businesses.",
      };
    }

    // Downgrade to GSM-7 HERE, at the boundary, not in each template.
    //
    // The templates are careful, but the values interpolated into them are
    // typed by clients and their customers — a shop named with a curly
    // apostrophe would force UCS-2 and cost triple no matter how the sentence
    // is written. This also covers review messages, whose bodies were rendered
    // and stored in the database possibly months before this code ran.
    const message = toGsm7(body);
    const cost = smsSegments(message);

    // Only the expensive case is logged. A one-credit send is the norm and
    // saying so on every booking would bury the case worth looking at.
    if (cost.segments > 1) {
      console.warn(
        "[sms:philsms] %d credits (%s, %d units) to=%s",
        cost.segments,
        cost.encoding,
        cost.units,
        philSmsRecipient(to),
      );
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
          message,
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

/** Build a PhilSmsConfig from env, or null when the token is missing. */
export function philSmsConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PhilSmsConfig | null {
  const apiToken = env.PHILSMS_API_TOKEN?.trim();
  return apiToken ? { apiToken } : null;
}
