/**
 * Email sender port — the same shape as the SMS port in lib/sms/sender.ts, for
 * the same reason: the workflows depend on this interface, not on a provider,
 * so the provider is swappable without touching them.
 *
 * `getEmailSender()` returns a Resend-backed sender when RESEND_API_KEY and
 * EMAIL_FROM are set; otherwise a stub that logs and reports success, so the
 * booking flow runs end to end on a machine with no mail provider configured.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text body. Always sent — it is the accessible, deliverable version. */
  text: string;
  /** Optional HTML alternative. */
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export interface ResendConfig {
  apiKey: string;
  from: string;
}

/** `env` is injectable so the half-configured cases are testable. */
export function resendConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): ResendConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

/**
 * Resend over plain `fetch` rather than their SDK — one HTTP call does not
 * justify a dependency, and this keeps the module usable in any runtime.
 */
export class ResendEmailSender implements EmailSender {
  constructor(private readonly config: ResendConfig) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });

      if (!res.ok) {
        // The body often names the real problem (unverified domain, bad key).
        // Logged server-side only — it never reaches a customer.
        const detail = await res.text().catch(() => "");
        console.error("[email:resend] %s %s", res.status, detail.slice(0, 500));
        return { success: false, error: `Provider responded ${res.status}` };
      }

      const body = (await res.json().catch(() => ({}))) as { id?: string };
      return { success: true, providerMessageId: body.id };
    } catch (error) {
      console.error("[email:resend]", error);
      return { success: false, error: "Email provider unreachable." };
    }
  }
}

class LogEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info(
      "[email:stub] to=%s subject=%o body=%o",
      message.to,
      message.subject,
      message.text,
    );
    return { success: true, providerMessageId: `stub_${Date.now()}` };
  }
}

export function getEmailSender(): EmailSender {
  const config = resendConfigFromEnv();
  return config ? new ResendEmailSender(config) : new LogEmailSender();
}
