import type { ReviewMessageRepository } from "@/repositories/review-message-repository";
import type { CustomerRepository } from "@/repositories/customer-repository";
import type { BusinessRepository } from "@/repositories/business-repository";
import type { SmsSender } from "@/lib/sms/sender";
import { isE164 } from "@/lib/sms/phone";
import { clipForSms } from "@/lib/sms/gsm7";
import type { Appointment } from "@/types/appointment";
import type { Business } from "@/types/business-entity";
import type { Customer } from "@/types/customer";
import type {
  NewReviewMessage,
  ProcessResult,
  ReviewMessage,
  ReviewMessageStep,
} from "@/types/review-message";

const DAY_MS = 24 * 60 * 60 * 1000;
const THANK_YOU_DELAY = 0;
const REVIEW_REQUEST_DELAY = 3 * DAY_MS;
const REMINDER_DELAY = (3 + 5) * DAY_MS; // 8 days total
const MAX_ATTEMPTS = 3; // total send attempts before giving up
const RETRY_BACKOFF_MS = 30 * 60 * 1000; // 30 min × attempt

/**
 * Review Automation workflow.
 *
 * On appointment completion, queues up to three messages (thank-you now,
 * review request +3d, reminder +8d) and sends the immediately-due one. A
 * scheduled processor (see the cron route) sends the rest as they fall due,
 * retrying failures with backoff. When a customer reviews, remaining queued
 * messages are cancelled. The actual carrier is injected (SmsSender).
 */
export class ReviewAutomationService {
  constructor(
    private readonly messages: ReviewMessageRepository,
    private readonly customers: CustomerRepository,
    private readonly businesses: BusinessRepository,
    private readonly sender: SmsSender,
  ) {}

  /**
   * The tenant's registered SMS sender ID, memoized in `cache`.
   *
   * `businesses.sms_sender_id`, not the business name — see migration 0028.
   * Best-effort: a failed lookup yields undefined and the provider decides what
   * that means (Semaphore uses its account default, PhilSMS declines).
   */
  private async senderIdFor(
    businessId: string,
    cache: Map<string, string | undefined>,
  ): Promise<string | undefined> {
    if (cache.has(businessId)) return cache.get(businessId);
    let senderId: string | undefined;
    try {
      senderId =
        (await this.businesses.findById(businessId))?.smsSenderId ?? undefined;
    } catch {
      senderId = undefined;
    }
    cache.set(businessId, senderId);
    return senderId;
  }

  /** Called when an appointment transitions into 'completed'. */
  async startForAppointment(
    businessId: string,
    appointment: Appointment,
  ): Promise<void> {
    if (!appointment.customerId) return;

    const [business, customer] = await Promise.all([
      this.businesses.findById(businessId),
      this.customers.findById(businessId, appointment.customerId),
    ]);
    if (!business || !customer) return;
    if (!customer.mobile) return; // nothing to text
    if (customer.smsStatus === "opted_out") return; // respect opt-out (STOP)
    if (!isE164(customer.mobile)) return; // only text a valid E.164 number
    if (customer.reviewStatus === "received") return; // already reviewed
    // Idempotent: don't re-queue if this appointment already has a campaign.
    if (await this.messages.existsForAppointment(businessId, appointment.id)) {
      return;
    }

    const now = Date.now();
    const queued: NewReviewMessage[] = (
      [
        ["thank_you", THANK_YOU_DELAY],
        ["review_request", REVIEW_REQUEST_DELAY],
        ["reminder", REMINDER_DELAY],
      ] as [ReviewMessageStep, number][]
    ).map(([step, delay]) => ({
      businessId,
      customerId: customer.id,
      appointmentId: appointment.id,
      step,
      body: renderBody(step, business, customer, appointment),
      toMobile: customer.mobile as string,
      customerName: customer.name,
      scheduledAt: new Date(now + delay).toISOString(),
    }));

    await this.messages.insertMany(queued);

    /*
     * The customer's reviewStatus is NOT touched here.
     *
     * It used to flip to "requested" at this point, which was wrong: at this
     * moment the only thing that has gone out is the thank-you, and that asks
     * for nothing. The review request itself is three days away and might
     * never send at all — the customer can reply STOP, the queue can exhaust
     * MAX_ATTEMPTS, or the campaign can be cancelled by a review arriving.
     *
     * Marking it here meant the dashboard reported "Requested, awaiting a
     * response" for someone nobody had asked, and `aggregateReviewRate`
     * divided by people who were merely queued — permanently understating the
     * real conversion rate. `markRequested` now does it when the review
     * request is actually sent.
     */

    // Fire the immediately-due thank-you now (rest handled by the processor),
    // scoped to this tenant — this runs inside an owner request, not the cron.
    await this.processDue(new Date().toISOString(), 100, businessId);
  }

  /**
   * Mark the customer as having been asked — only once the REVIEW REQUEST has
   * actually left, and only from `pending`.
   *
   * Never from "received": a customer who reviewed after the thank-you but
   * before the request would otherwise be walked backwards into "requested" by
   * a message that is about to be cancelled anyway.
   *
   * Best-effort. The message is already marked sent by the time this runs, so
   * throwing here would fail a batch over a status label and risk re-sending
   * on the next pass.
   */
  private async markRequested(message: ReviewMessage): Promise<void> {
    if (message.step !== "review_request") return;
    try {
      const customer = await this.customers.findById(
        message.businessId,
        message.customerId,
      );
      if (customer?.reviewStatus !== "pending") return;
      await this.customers.update(message.businessId, message.customerId, {
        reviewStatus: "requested",
      });
    } catch (error) {
      console.error("[review:markRequested]", errorText(error));
    }
  }

  /**
   * Send every due, queued message in scope.
   *
   * Scope comes from `businessId`, NOT from which client was injected. RLS used
   * to be the boundary, but impersonation runs owner-facing code on the
   * service-role client, so the id has to be explicit.
   *
   * @param businessId Restrict to one tenant. Only the scheduler may leave this
   *   null (it serves everyone); an unscoped call from a tenant's back office
   *   would claim and send other clients' messages.
   */
  async processDue(
    nowIso: string,
    limit = 100,
    businessId: string | null = null,
  ): Promise<ProcessResult> {
    // Atomically CLAIM due messages before sending. Concurrent processors get
    // disjoint rows (FOR UPDATE SKIP LOCKED), so nothing is sent twice.
    const due = await this.messages.claimDue(nowIso, limit, businessId);
    let sent = 0;
    let failed = 0;

    // Sender IDs, resolved once per tenant per run. The scheduler processes
    // every business in one pass, so without the cache a full queue would issue
    // one business lookup per message to say the same thing each time.
    const senderIds = new Map<string, string | undefined>();

    for (const message of due) {
      // Idempotency: if a prior run already obtained a provider message id for
      // this row but didn't finish marking it sent, do NOT send again — just
      // finalize it.
      if (message.providerMessageId) {
        await this.messages.markSent(
          message.id,
          message.attempts,
          message.providerMessageId,
        );
        await this.markRequested(message);
        sent += 1;
        continue;
      }

      const attempts = message.attempts + 1;
      let result;
      try {
        result = await this.sender.send(message.toMobile, message.body, {
          senderId: await this.senderIdFor(message.businessId, senderIds),
        });
      } catch (error) {
        result = { success: false, error: errorText(error) };
      }

      if (result.success) {
        await this.messages.markSent(
          message.id,
          attempts,
          result.providerMessageId ?? null,
        );
        await this.markRequested(message);
        sent += 1;
      } else if (attempts < MAX_ATTEMPTS) {
        // Retry later with linear backoff.
        const next = new Date(
          Date.now() + attempts * RETRY_BACKOFF_MS,
        ).toISOString();
        await this.messages.reschedule(
          message.id,
          attempts,
          next,
          result.error ?? null,
        );
        failed += 1;
      } else {
        await this.messages.markFailed(
          message.id,
          attempts,
          result.error ?? null,
        );
        failed += 1;
      }
    }

    return { processed: due.length, sent, failed };
  }

  /** Cancel remaining queued messages once the customer has reviewed. */
  async cancelForCustomer(
    businessId: string,
    customerId: string,
  ): Promise<number> {
    return this.messages.cancelPending(businessId, customerId);
  }
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function renderBody(
  step: ReviewMessageStep,
  business: Business,
  customer: Customer,
  appointment: Appointment,
): string {
  const name = firstName(customer.name);
  const shop = clipForSms(business.name, 24);
  const link = business.googleReviewUrl;
  const service = appointment.service
    ? ` after your ${clipForSms(appointment.service, 24)}`
    : "";

  // These carry an emoji, which forces the whole body to UCS-2 (67 chars per
  // concatenated segment instead of 153), so each of the three runs to 2-4
  // segments rather than one. That is a deliberate copy choice — warmth over
  // per-send cost — but it means an appointment costs ~10 segments, not 3.
  // Names stay clipped so a long tenant name can't add yet another one.
  // (The review link is kept — unlike the owner alert, acting on it IS the
  // point of the message, and there is no other channel carrying it.)
  switch (step) {
    case "thank_you":
      return `Hi ${name}! Thanks for choosing ${shop}${service}. Hope you had a great experience with us. See you again soon! 😊`;
    case "review_request":
      return `Hi ${name}! Hope you enjoyed your visit to ${shop}. If you have a moment, we'd really appreciate a quick review. Your feedback can help others feel confident choosing us too. 😊${
        link ? ` ${link}` : ""
      }`;
    case "reminder":
      return `Hi ${name}! Just a quick follow-up 😊 If you haven't had a chance to leave a review, we'd really appreciate it. Your experience could help someone else who's thinking of visiting ${shop}.${
        link ? ` ${link}` : ""
      }`;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown send error";
}

/** Re-exported so callers can display the sent messages. */
export type { ReviewMessage };
