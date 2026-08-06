import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import { SubscriberRepository } from "@/repositories/subscriber-repository";
import { getEmailSender } from "@/lib/email/sender";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { logError } from "@/lib/observability/logger";

/**
 * Joining and leaving a business's mailing list.
 *
 * CONFIRMED OPT-IN, and the whole design follows from it: a signup stores a
 * `pending` row and sends one email. Nothing else is ever sent to an address
 * that has not clicked. That costs one message and buys three things — a typo
 * goes quiet instead of mailing a stranger forever, someone typing an enemy's
 * address achieves nothing, and there is a record that the person on the other
 * end actually asked.
 *
 * WHAT THE PUBLIC IS TOLD NEVER VARIES. Subscribing, re-subscribing and
 * subscribing an address already on the list all produce the same reply. The
 * form must not become a way to ask "is this person a customer of that bakery?"
 */

export type SubscribeOutcome = "sent" | "already_subscribed" | "unavailable";

export class SubscriberService {
  private readonly subscribers: SubscriberRepository;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.subscribers = new SubscriberRepository(supabase);
  }

  /**
   * Take a signup and send the confirmation.
   *
   * Returns `unavailable` when the business cannot send — no verified sender,
   * or not active. The caller answers the visitor identically either way; this
   * distinction exists for logging, not for the response.
   */
  async subscribe(input: {
    business: Business;
    email: string;
    consentText: string | null;
    source: string | null;
  }): Promise<SubscribeOutcome> {
    const { business, email } = input;
    if (!canSend(business)) return "unavailable";

    const confirmToken = randomToken();
    const row = await this.subscribers.upsertPending({
      businessId: business.id,
      email,
      confirmToken,
      consentText: input.consentText,
      source: input.source,
    });

    /*
     * Already confirmed: send nothing.
     *
     * `upsertPending` moved the row back to `pending`, which is the correct
     * resting state for a repeat signup — but mailing a fresh confirmation to
     * someone already on the list is a message they did not ask for, and at
     * volume it is indistinguishable from spam. They stay subscribed; we simply
     * do not write to them.
     */
    if (row.status === "subscribed") return "already_subscribed";

    await this.sendConfirmation(business, email, row.confirmToken ?? confirmToken);
    return "sent";
  }

  /**
   * Complete a signup from a confirmation link.
   *
   * A token that matches nothing returns `already` rather than an error: the
   * commonest reason is a second click on a link whose token was burned by the
   * first, and telling that person something went wrong would be a lie.
   */
  async confirm(token: string): Promise<"confirmed" | "already"> {
    const row = await this.subscribers.findByConfirmToken(token);
    if (!row) return "already";
    await this.subscribers.confirm(row.id);
    return "confirmed";
  }

  /**
   * Leave the list.
   *
   * Idempotent, and silent about whether the token was real. Someone who clicks
   * unsubscribe twice, or whose mail client prefetched the link, must see that
   * they are off the list — not an error, and not a hint about which addresses
   * exist.
   */
  async unsubscribe(token: string): Promise<void> {
    const row = await this.subscribers.findByUnsubscribeToken(token);
    if (row && row.status !== "unsubscribed") {
      await this.subscribers.unsubscribe(row.id);
    }
  }

  /**
   * The confirmation email.
   *
   * Sent from the TENANT's verified domain, never the platform's — `canSend`
   * has already established that. Failure is logged and swallowed: the row is
   * stored, and a mail outage must not turn into an error page for a stranger
   * who did nothing wrong. They will simply not be subscribed, which is the
   * safe direction to fail.
   */
  private async sendConfirmation(
    business: Business,
    email: string,
    token: string,
  ): Promise<void> {
    const url = `${siteBaseUrl()}/subscribe/confirm?token=${encodeURIComponent(token)}`;
    const name = business.newsletterFromName || business.name;

    try {
      await getEmailSender().send({
        to: email,
        fromAddress: business.newsletterFromEmail ?? undefined,
        fromName: name,
        subject: `Confirm your subscription to ${name}`,
        text: [
          `Someone — we hope you — asked to receive updates from ${name}.`,
          "",
          "Confirm by opening this link:",
          url,
          "",
          "If it wasn't you, ignore this email. Nothing else will be sent, and",
          "your address will not be added.",
        ].join("\n"),
      });
    } catch (error) {
      logError(error, { scope: "subscribers:confirmation", businessId: business.id });
    }
  }
}

/**
 * Whether a business may send at all.
 *
 * Both halves matter. An unverified sender means the domain has no SPF/DKIM
 * records the platform has checked, so mail would be filtered or rejected and
 * the reputation spent finding out. A business that is not active should not be
 * emailing anyone in its name.
 */
export function canSend(business: Business): boolean {
  return (
    business.status === "active" &&
    business.newsletterVerified &&
    Boolean(business.newsletterFromEmail)
  );
}

/**
 * 32 hex characters from the platform's CSPRNG.
 *
 * `crypto.randomUUID` would be shorter to write but a UUIDv4 carries version
 * and variant bits, so it is 122 bits of randomness in a shape people recognise
 * and try to parse. This is 128 bits of nothing in particular, which is what a
 * bearer token in a URL should look like.
 */
function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
