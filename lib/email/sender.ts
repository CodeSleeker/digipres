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
  /**
   * Who the mail should appear to be FROM, e.g. the tenant's business name.
   *
   * A display name only — deliberately NOT a full address. This platform sends
   * for many businesses from one verified domain, so the owner of Ronie's must
   * see "Ronie's Barber" and never the platform's name or, worse, another
   * client's. But letting a caller supply the whole From header would let
   * tenant-controlled data choose the ADDRESS too, and the business name is
   * edited by the client. Splitting it this way makes that impossible: the
   * address always comes from EMAIL_FROM, the name is sanitised and quoted.
   */
  fromName?: string;
  /**
   * Where a reply should go, when that is not the From address.
   *
   * The platform sends from one verified domain, so hitting Reply on a lead
   * notification would otherwise mail the platform itself. Setting this makes
   * Reply go to the person who filled the form, which is the whole point of a
   * bookings inbox.
   *
   * An ADDRESS only, no display name: this value comes from a stranger's form
   * submission, and a display name is where header-injection lives (see
   * `quoteDisplayName`). Sanitised in `replyToAddress` before it is sent.
   */
  replyTo?: string;
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
 * The bare `user@host` out of an address that may carry a display name, so a
 * new name can be put on it. `EMAIL_FROM` is written either way in practice.
 */
export function bareAddress(from: string): string {
  const angled = /<([^<>]+)>\s*$/.exec(from.trim());
  return (angled ? angled[1]! : from).trim();
}

/** Unicode control characters: C0 and C1, so CR and LF included. */
const CONTROL_CHARS = /\p{Cc}/gu;

/**
 * A display name that cannot break out of the From header.
 *
 * The input is the business name, which the client edits — so it is hostile
 * input, and the two things it must not be able to do are inject a second
 * address and split the header.
 *
 * Both are closed by ALWAYS emitting a quoted-string. Inside quotes, `<`, `>`,
 * `@`, `,` and `;` are literal text rather than delimiters, so a business
 * called `Evil <ceo@bank.example>, Real` becomes one harmless display name
 * instead of a second From address. `\` and `"` are escaped, and control
 * characters are stripped before any of that.
 *
 * Returns null when nothing usable survives, so the caller can fall back to the
 * configured From rather than send `"" <addr>`.
 */
export function quoteDisplayName(raw: string): string | null {
  const cleaned = raw
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Long display names get folded or truncated by relays; do it predictably.
    .slice(0, 78);

  if (!cleaned) return null;
  return `"${cleaned.replace(/([\\"])/g, "\\$1")}"`;
}

/**
 * A Reply-To safe to put in a header, or null.
 *
 * Accepts a bare `user@host` and nothing else. The value originates in a public
 * form, so the things it must not be able to do are carry a display name, smuggle
 * a second recipient, or split the header — and the simplest way to guarantee
 * all three is to refuse anything that is not one plain address.
 *
 * Returns null rather than a cleaned-up guess: a malformed Reply-To is worth
 * dropping, and the body already names the sender.
 */
export function replyToAddress(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(CONTROL_CHARS, "").trim();
  // One address: no spaces, no commas or semicolons, no angle brackets.
  if (!/^[^\s<>(),;:"\\[\]]+@[^\s<>(),;:"\\[\]]+\.[A-Za-z]{2,}$/.test(value)) {
    return null;
  }
  return value.length <= 254 ? value : null;
}

/** `EMAIL_FROM`'s address, presented under `displayName`. */
export function applyDisplayName(
  configuredFrom: string,
  displayName: string | undefined,
): string {
  const quoted = displayName ? quoteDisplayName(displayName) : null;
  return quoted ? `${quoted} <${bareAddress(configuredFrom)}>` : configuredFrom;
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
          from: applyDisplayName(this.config.from, message.fromName),
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          // Omitted entirely when it doesn't survive sanitising — Resend treats
          // an empty reply_to as a value, not as "unset".
          ...(replyToAddress(message.replyTo)
            ? { reply_to: replyToAddress(message.replyTo) }
            : {}),
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
      "[email:stub] from=%o to=%s subject=%o body=%o",
      // Mirrors what the real sender would build, so the stub is a useful
      // preview of the From header rather than just of the body.
      applyDisplayName(
        process.env.EMAIL_FROM ?? "(EMAIL_FROM unset)",
        message.fromName,
      ),
      message.to,
      message.subject,
      message.text,
    );
    if (message.replyTo) {
      console.info("[email:stub] reply-to=%s", replyToAddress(message.replyTo));
    }
    return { success: true, providerMessageId: `stub_${Date.now()}` };
  }
}

export function getEmailSender(): EmailSender {
  const config = resendConfigFromEnv();
  return config ? new ResendEmailSender(config) : new LogEmailSender();
}
