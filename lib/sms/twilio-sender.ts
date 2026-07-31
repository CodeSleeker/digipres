import type { SmsSender, SmsSendResult } from "./sender";

/**
 * Twilio-backed SmsSender. Speaks Twilio's REST API directly over fetch — no SDK
 * dependency. Implements the same port the review automation depends on, so it
 * drops in behind `getSmsSender()` with no workflow changes.
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Preferred: a Messaging Service (handles sender pool, opt-out, retries). */
  messagingServiceSid?: string;
  /** Alternative: a single Twilio phone number in E.164. */
  fromNumber?: string;
  /** Optional: URL Twilio posts delivery-status updates to (for "delivered"). */
  statusCallbackUrl?: string;
}

export class TwilioSmsSender implements SmsSender {
  constructor(private readonly config: TwilioConfig) {}

  /**
   * The port's `options.senderId` is deliberately not declared here. Twilio
   * originates from a number or messaging service you own, so there is no
   * per-tenant label to set — the business name reaches the recipient in the
   * message body instead. Dropping the parameter still satisfies SmsSender, and
   * says "ignored" more clearly than an unused argument would.
   */
  async send(to: string, body: string): Promise<SmsSendResult> {
    const { accountSid, authToken } = this.config;
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams({ To: to, Body: body });
    if (this.config.messagingServiceSid) {
      params.set("MessagingServiceSid", this.config.messagingServiceSid);
    } else if (this.config.fromNumber) {
      params.set("From", this.config.fromNumber);
    }
    if (this.config.statusCallbackUrl) {
      params.set("StatusCallback", this.config.statusCallbackUrl);
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = (await res.json().catch(() => ({}))) as {
        sid?: string;
        message?: string;
        code?: number;
      };

      if (!res.ok) {
        // Twilio returns { code, message } on error — surface a safe summary.
        return {
          success: false,
          error: data.message
            ? `Twilio ${data.code ?? res.status}: ${data.message}`
            : `Twilio request failed (HTTP ${res.status})`,
        };
      }

      return { success: true, providerMessageId: data.sid };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Twilio request failed",
      };
    }
  }
}

/** Build a TwilioConfig from env, or null when Twilio isn't fully configured. */
export function twilioConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): TwilioConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = env.TWILIO_FROM_NUMBER;

  // Need credentials AND a way to originate (a messaging service or a number).
  if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
    return null;
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid,
    fromNumber,
    statusCallbackUrl: env.TWILIO_STATUS_CALLBACK_URL,
  };
}
