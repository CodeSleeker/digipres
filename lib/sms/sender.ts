/**
 * SMS sender port. The review automation depends on this interface, not on any
 * particular provider, so the carrier is swappable without touching the workflow.
 *
 * `getSmsSender()` returns a Twilio-backed sender when the TWILIO_* env vars are
 * set; otherwise it falls back to a stub that logs and reports success —
 * messages progress to "sent" but nothing leaves the server. Delivery receipts
 * ("delivered") arrive via the Twilio status webhook once configured.
 */

import { TwilioSmsSender, twilioConfigFromEnv } from "./twilio-sender";

export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsSender {
  send(to: string, body: string): Promise<SmsSendResult>;
}

class LogSmsSender implements SmsSender {
  async send(to: string, body: string): Promise<SmsSendResult> {
    console.info("[sms:stub] to=%s body=%o", to, body);
    return { success: true, providerMessageId: `stub_${Date.now()}` };
  }
}

export function getSmsSender(): SmsSender {
  const config = twilioConfigFromEnv();
  return config ? new TwilioSmsSender(config) : new LogSmsSender();
}
