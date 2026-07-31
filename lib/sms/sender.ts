/**
 * SMS sender port. The review automation and the booking notices depend on this
 * interface, not on any particular provider, so the carrier is swappable without
 * touching the workflows.
 *
 * `getSmsSender()` picks the provider from SMS_PROVIDER. Blank auto-detects from
 * whichever credentials are present, which keeps existing Twilio-only
 * deployments working untouched. With nothing configured it falls back to a stub
 * that logs and reports success — messages progress to "sent" but nothing leaves
 * the server, so the booking flow runs end to end on a dev machine.
 */

import { TwilioSmsSender, twilioConfigFromEnv } from "./twilio-sender";
import { PhilSmsSender, philSmsConfigFromEnv } from "./philsms-sender";

export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsSendOptions {
  /**
   * Who the text should appear to come FROM — the tenant's business name.
   *
   * Only alphanumeric-sender-ID carriers (PhilSMS, Semaphore) can honour this;
   * Twilio originates from a number you own and ignores it. It is a REQUEST,
   * not a guarantee, and deliberately so: the caller passes the business name
   * once and each provider does whatever it can with it, rather than every
   * caller having to know which carrier is configured.
   */
  senderId?: string;
}

export interface SmsSender {
  send(
    to: string,
    body: string,
    options?: SmsSendOptions,
  ): Promise<SmsSendResult>;
}

class LogSmsSender implements SmsSender {
  async send(
    to: string,
    body: string,
    options?: SmsSendOptions,
  ): Promise<SmsSendResult> {
    console.info(
      "[sms:stub] to=%s from=%s body=%o",
      to,
      options?.senderId ?? "(default)",
      body,
    );
    return { success: true, providerMessageId: `stub_${Date.now()}` };
  }
}

/** Carriers this codebase can actually talk to. */
export type SmsProvider = "twilio" | "philsms";

export function getSmsSender(
  env: Record<string, string | undefined> = process.env,
): SmsSender {
  const choice = env.SMS_PROVIDER?.trim().toLowerCase();

  if (choice === "philsms") {
    const config = philSmsConfigFromEnv(env);
    if (config) return new PhilSmsSender(config);
    // Never silently downgrade a deliberate choice — an unexplained stub is
    // indistinguishable from a carrier that accepted the message and dropped it.
    console.error("[sms] SMS_PROVIDER=philsms but PHILSMS_API_TOKEN is unset.");
    return new LogSmsSender();
  }

  if (choice === "twilio") {
    const config = twilioConfigFromEnv(env);
    if (config) return new TwilioSmsSender(config);
    console.error("[sms] SMS_PROVIDER=twilio but the TWILIO_* vars are unset.");
    return new LogSmsSender();
  }

  if (choice) {
    console.error(
      "[sms] SMS_PROVIDER=%s is not a provider this build supports (twilio, philsms).",
      choice,
    );
    return new LogSmsSender();
  }

  // Blank: auto-detect. Twilio first, so deployments that predate SMS_PROVIDER
  // keep the exact behaviour they had.
  return (
    tryTwilio(env) ?? tryPhilSms(env) ?? new LogSmsSender()
  );
}

function tryTwilio(env: Record<string, string | undefined>): SmsSender | null {
  const config = twilioConfigFromEnv(env);
  return config ? new TwilioSmsSender(config) : null;
}

function tryPhilSms(env: Record<string, string | undefined>): SmsSender | null {
  const config = philSmsConfigFromEnv(env);
  return config ? new PhilSmsSender(config) : null;
}
