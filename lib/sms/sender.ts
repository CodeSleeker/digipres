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
import {
  SemaphoreSmsSender,
  semaphoreConfigFromEnv,
} from "./semaphore-sender";

export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsSendOptions {
  /**
   * Who the text should appear to come FROM — `businesses.sms_sender_id`, set
   * per tenant by platform staff (migration 0028).
   *
   * Only alphanumeric-sender-ID carriers honour it: Semaphore uses it as
   * `sendername` and omits the field entirely when absent (falling back to the
   * account's registered default); PhilSMS requires it and fails without one;
   * Twilio originates from a number you own and ignores it. Callers pass it
   * unconditionally rather than needing to know which carrier is configured.
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
export type SmsProvider = "twilio" | "philsms" | "semaphore";

export const SMS_PROVIDERS: SmsProvider[] = ["twilio", "philsms", "semaphore"];

/** Each provider's builder plus the variable to name when it isn't configured. */
const BUILDERS: Record<
  SmsProvider,
  {
    build: (env: Record<string, string | undefined>) => SmsSender | null;
    requires: string;
  }
> = {
  twilio: {
    build: (env) => {
      const config = twilioConfigFromEnv(env);
      return config ? new TwilioSmsSender(config) : null;
    },
    requires: "the TWILIO_* vars",
  },
  philsms: {
    build: (env) => {
      const config = philSmsConfigFromEnv(env);
      return config ? new PhilSmsSender(config) : null;
    },
    requires: "PHILSMS_API_TOKEN",
  },
  semaphore: {
    build: (env) => {
      const config = semaphoreConfigFromEnv(env);
      return config ? new SemaphoreSmsSender(config) : null;
    },
    requires: "SEMAPHORE_API_KEY",
  },
};

export function getSmsSender(
  env: Record<string, string | undefined> = process.env,
): SmsSender {
  const choice = env.SMS_PROVIDER?.trim().toLowerCase();

  if (choice) {
    const entry = BUILDERS[choice as SmsProvider];
    if (!entry) {
      console.error(
        "[sms] SMS_PROVIDER=%s is not supported (%s).",
        choice,
        SMS_PROVIDERS.join(", "),
      );
      return new LogSmsSender();
    }
    const sender = entry.build(env);
    if (sender) return sender;
    // Never silently downgrade a deliberate choice, and never fall through to a
    // DIFFERENT configured carrier — texts going out under the wrong account is
    // worse than none going out, and an unexplained stub is indistinguishable
    // from a carrier that accepted the message and dropped it.
    console.error(
      "[sms] SMS_PROVIDER=%s but %s is unset.",
      choice,
      entry.requires,
    );
    return new LogSmsSender();
  }

  // Blank: auto-detect. Twilio first, so deployments that predate SMS_PROVIDER
  // keep the exact behaviour they had.
  for (const name of SMS_PROVIDERS) {
    const sender = BUILDERS[name].build(env);
    if (sender) return sender;
  }
  return new LogSmsSender();
}
