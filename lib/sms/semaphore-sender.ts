import type { SmsSender, SmsSendOptions, SmsSendResult } from "./sender";
import { normalizeSenderId } from "./sender-id";
import { smsSegments, toGsm7 } from "./gsm7";

/**
 * Semaphore-backed SmsSender (Philippines).
 *
 * POST https://api.semaphore.co/api/v4/messages
 *   apikey, number, message, sendername?
 *
 * Form-encoded rather than JSON: that is what their documentation uses, and it
 * sidesteps any ambiguity about how they parse the body.
 *
 * Two behaviours of theirs are worth knowing, both handled below:
 *  - The response is an ARRAY, one entry per recipient, even for a single send.
 *  - A message beginning with the word "TEST" is SILENTLY IGNORED — accepted,
 *    never delivered, no error.
 */
export interface SemaphoreConfig {
  apiKey: string;
}

const ENDPOINT = "https://api.semaphore.co/api/v4/messages";

/** Statuses that mean the message will not reach anyone. */
const FAILED_STATUSES = new Set(["failed", "refunded"]);

/**
 * Semaphore is PH-only and documents numbers as `09171234567` or
 * `639171234567`. Stored numbers are E.164, so the leading "+" comes off.
 */
export function semaphoreRecipient(to: string): string {
  return to.trim().replace(/^\+/, "");
}

/**
 * Their docs: "Please do not start your message with the word TEST. These
 * messages are silently ignored and will not be sent."
 *
 * Nothing this platform sends begins that way today, but a future template or a
 * tenant-supplied value could, and the failure mode is invisible — the API
 * returns success and the customer simply never hears anything. Cheap to detect.
 */
export function startsWithTest(body: string): boolean {
  return /^\s*test\b/i.test(body);
}

export class SemaphoreSmsSender implements SmsSender {
  constructor(private readonly config: SemaphoreConfig) {}

  async send(
    to: string,
    body: string,
    options?: SmsSendOptions,
  ): Promise<SmsSendResult> {
    const message = toGsm7(body);

    if (startsWithTest(message)) {
      return {
        success: false,
        error:
          'Semaphore silently discards messages starting with "TEST" — refusing to send.',
      };
    }

    const cost = smsSegments(message);
    if (cost.segments > 1) {
      console.warn(
        "[sms:semaphore] %d credits (%s, %d units) to=%s",
        cost.segments,
        cost.encoding,
        cost.units,
        semaphoreRecipient(to),
      );
    }

    const form = new URLSearchParams({
      apikey: this.config.apiKey,
      number: semaphoreRecipient(to),
      message,
    });

    // Omitted entirely when this business has no sender ID, which is what makes
    // Semaphore fall back to the account's registered default Sender Name. An
    // empty `sendername=` is NOT the same thing and would be an error.
    const senderId = normalizeSenderId(options?.senderId ?? "");
    if (senderId) form.set("sendername", senderId);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      });

      const data = (await res.json().catch(() => null)) as
        | { message_id?: number | string; status?: string }[]
        | { message?: string; [k: string]: unknown }
        | null;

      if (!res.ok) {
        // Errors come back as an object (often field → [messages]), not the
        // array a success returns. Logged in full; summarised to the caller.
        console.error("[sms:semaphore] %s %o", res.status, data);
        return {
          success: false,
          error: `Semaphore request failed (HTTP ${res.status})`,
        };
      }

      const first = Array.isArray(data) ? data[0] : undefined;
      if (!first) {
        console.error("[sms:semaphore] unexpected response %o", data);
        return { success: false, error: "Semaphore returned no message." };
      }

      const status = String(first.status ?? "").toLowerCase();
      if (FAILED_STATUSES.has(status)) {
        return { success: false, error: `Semaphore status: ${first.status}` };
      }

      // Queued / Pending / Sent all mean accepted for delivery.
      return {
        success: true,
        providerMessageId:
          first.message_id != null ? String(first.message_id) : undefined,
      };
    } catch (error) {
      console.error("[sms:semaphore]", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Semaphore unreachable",
      };
    }
  }
}

/** Build a SemaphoreConfig from env, or null when the key is missing. */
export function semaphoreConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): SemaphoreConfig | null {
  const apiKey = env.SEMAPHORE_API_KEY?.trim();
  return apiKey ? { apiKey } : null;
}
