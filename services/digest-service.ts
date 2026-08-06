import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import type { Creation, SendableSubscriber } from "@/types/subscriber";
import {
  CreationRepository,
  DigestRepository,
  SubscriberRepository,
} from "@/repositories/subscriber-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { getEmailSender, type EmailSender } from "@/lib/email/sender";
import { siteBaseUrl } from "@/lib/tenant/urls";
import { logError } from "@/lib/observability/logger";
import { canSend } from "./subscriber-service";

/**
 * The weekly digest: what a business made this week, to the people who asked.
 *
 * ONLY WHEN THERE IS SOMETHING TO SAY. A business with no new creations in the
 * window is skipped entirely — no mail, and no digest row, so the window rolls
 * forward to the next run rather than being consumed. A weekly email that says
 * "nothing new this week" is how a list teaches people to ignore it.
 *
 * IDEMPOTENT BY WINDOW. Each run starts where the last recorded one ended, so a
 * retry, an overlapping schedule or a manual trigger cannot mail the same
 * creations twice. A business that has never had a digest gets a first window
 * of the preceding week rather than its entire history.
 */

/** How far back a business's FIRST digest reaches. */
const FIRST_WINDOW_DAYS = 7;

export interface DigestResult {
  businessesConsidered: number;
  businessesSent: number;
  emailsSent: number;
  emailsFailed: number;
}

export class DigestService {
  private readonly creations: CreationRepository;
  private readonly subscribers: SubscriberRepository;
  private readonly digests: DigestRepository;
  private readonly businesses: BusinessRepository;

  constructor(
    supabase: SupabaseClient<Database>,
    private readonly email: EmailSender = getEmailSender(),
  ) {
    this.creations = new CreationRepository(supabase);
    this.subscribers = new SubscriberRepository(supabase);
    this.digests = new DigestRepository(supabase);
    this.businesses = new BusinessRepository(supabase);
  }

  /**
   * Run for every business that can send, or for one.
   *
   * `now` is injected so the window arithmetic is testable without waiting a
   * week, and so a whole run shares one instant — otherwise the boundary moves
   * between businesses and a creation published mid-run could fall into no
   * window at all.
   */
  async run(options: {
    now?: Date;
    businessId?: string;
  } = {}): Promise<DigestResult> {
    const now = options.now ?? new Date();
    const result: DigestResult = {
      businessesConsidered: 0,
      businessesSent: 0,
      emailsSent: 0,
      emailsFailed: 0,
    };

    const businesses = options.businessId
      ? [await this.businesses.findById(options.businessId)].filter(
          (b): b is Business => b !== null,
        )
      : await this.businesses.listNewsletterSenders();

    for (const business of businesses) {
      if (!canSend(business)) continue;
      result.businessesConsidered += 1;

      try {
        const sent = await this.runFor(business, now);
        if (sent) {
          result.businessesSent += 1;
          result.emailsSent += sent.sentCount;
          result.emailsFailed += sent.failedCount;
        }
      } catch (error) {
        // One tenant's failure must not stop the rest of the run.
        logError(error, { scope: "digest:business", businessId: business.id });
      }
    }

    return result;
  }

  private async runFor(
    business: Business,
    now: Date,
  ): Promise<{ sentCount: number; failedCount: number } | null> {
    const coveredTo = now.toISOString();
    const last = await this.digests.latest(business.id);
    const coveredFrom =
      last?.coveredTo ??
      new Date(now.getTime() - FIRST_WINDOW_DAYS * 86_400_000).toISOString();

    // A window that has already been covered — a double-scheduled run, or a
    // manual trigger straight after the cron.
    if (coveredFrom >= coveredTo) return null;

    const creations = await this.creations.publishedBetween(
      business.id,
      coveredFrom,
      coveredTo,
    );
    // Nothing new: skip WITHOUT recording, so the window stays open and this
    // week's bake still counts as news whenever it appears.
    if (creations.length === 0) return null;

    const recipients = await this.subscribers.sendable(business.id);
    if (recipients.length === 0) return null;

    let sentCount = 0;
    let failedCount = 0;
    for (const recipient of recipients) {
      const ok = await this.sendOne(business, recipient, creations);
      if (ok) sentCount += 1;
      else failedCount += 1;
    }

    await this.digests.record({
      businessId: business.id,
      coveredFrom,
      coveredTo,
      creationCount: creations.length,
      sentCount,
      failedCount,
    });

    return { sentCount, failedCount };
  }

  private async sendOne(
    business: Business,
    recipient: SendableSubscriber,
    creations: Creation[],
  ): Promise<boolean> {
    const name = business.newsletterFromName || business.name;
    const token = encodeURIComponent(recipient.unsubscribeToken);
    // Two URLs for the same act. The header one is POSTed by the mail provider
    // with nobody watching; the body one is opened by a person and explains
    // what just happened.
    const oneClickUrl = `${siteBaseUrl()}/api/unsubscribe?token=${token}`;
    const readableUrl = `${siteBaseUrl()}/unsubscribe?token=${token}`;

    try {
      const res = await this.email.send({
        to: recipient.email,
        fromAddress: business.newsletterFromEmail ?? undefined,
        fromName: name,
        subject: digestSubject(name, creations),
        text: digestText(name, creations, readableUrl),
        // Gmail and Outlook draw their own unsubscribe button from this, which
        // is what a reader reaches for instead of the spam button.
        listUnsubscribeUrl: oneClickUrl,
      });
      return res.success;
    } catch (error) {
      logError(error, { scope: "digest:send", businessId: business.id });
      return false;
    }
  }
}

/** "Three new things from Desserts by Arah" — the count is the news. */
export function digestSubject(name: string, creations: Creation[]): string {
  return creations.length === 1
    ? `${creations[0]!.name} — new from ${name}`
    : `${creations.length} new things from ${name}`;
}

/**
 * The plain-text body.
 *
 * Text only, deliberately. It is the version that always arrives, always
 * renders and is never clipped by a mail client; an HTML alternative is worth
 * adding, but not at the cost of the one that works everywhere.
 *
 * The unsubscribe line is IN THE BODY as well as in the headers, because the
 * header button only exists in some clients and a reader who cannot find the
 * way out uses the spam button instead.
 */
export function digestText(
  name: string,
  creations: Creation[],
  unsubscribeUrl: string,
): string {
  const items = creations.map((creation) => {
    const parts = [`• ${creation.name}`];
    if (creation.price) parts.push(`  ${creation.price}`);
    if (creation.description) parts.push(`  ${creation.description}`);
    return parts.join("\n");
  });

  return [
    `New from ${name}:`,
    "",
    items.join("\n\n"),
    "",
    "—",
    "You are receiving this because you asked for updates from",
    `${name}. To stop, open this link:`,
    unsubscribeUrl,
  ].join("\n");
}
