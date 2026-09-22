import { getSmsSender } from "@/lib/sms/sender";
import { isE164 } from "@/lib/sms/phone";
import { clipForSms } from "@/lib/sms/gsm7";
import { getEmailSender } from "@/lib/email/sender";
import {
  tenantSenderAddress,
  tenantSenderName,
} from "@/lib/email/tenant-sender";

/**
 * Texts to the CUSTOMER about their own booking — distinct from
 * booking-notice.ts, which tells the owner a booking arrived.
 *
 * Two moments, and only two: the request landing ("we have it, we'll confirm")
 * and the owner confirming it ("you're booked"). Both are transactional replies
 * to something the customer just did, which is what keeps them useful rather
 * than noise.
 *
 * Sending is best-effort and never throws. The booking is already saved by the
 * time these run, so a carrier outage must not turn a successful booking into
 * an error for someone who did nothing wrong.
 */

export interface CustomerBookingNotice {
  businessName: string;
  /**
   * `businesses.sms_sender_id` — the label the customer sees, registered with
   * the carrier. Separate from `businessName`, which is only message copy.
   */
  smsSenderId?: string | null;
  customerName: string;
  service: string | null;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:mm — the customer's own wall clock, as stored. */
  time: string;
}

/** Who a text may be sent to. */
export interface TextableCustomer {
  mobile: string | null;
  smsStatus: string | null;
}

/**
 * The same three guards the review automation applies, for the same reasons:
 * no number, a number the carrier would reject, or a person who replied STOP.
 * Opt-out is keyed by phone number across every tenant (features/sms/opt-out),
 * so honouring it here is not optional.
 */
export function canTextCustomer(customer: TextableCustomer): boolean {
  if (!customer.mobile) return false;
  if (customer.smsStatus === "opted_out") return false;
  return isE164(customer.mobile);
}

/** "Juan Dela Cruz" → "Juan". A text that uses the full legal name reads oddly. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

/**
 * One 160-character GSM-7 segment — one credit — and these go to customers, so
 * the volume is whatever the site attracts rather than something the owner
 * controls. The names are clipped because a long shop or service name would
 * otherwise push the message into a second segment on every single booking.
 *
 * Plain ASCII punctuation only. One curly apostrophe here would halve the
 * segment size for every text the platform sends.
 */
export function bookingReceivedSms(notice: CustomerBookingNotice): string {
  const service = notice.service ? ` for ${clipForSms(notice.service, 24)}` : "";
  return (
    // "request" is load-bearing: it is what stops the customer reading this as
    // "you're booked" before the owner has actually accepted it.
    `Hi ${firstName(notice.customerName)}, ${clipForSms(notice.businessName, 24)} got your booking request` +
    `${service} on ${notice.date} ${notice.time}. We'll confirm shortly.`
  );
}

export function bookingConfirmedSms(notice: CustomerBookingNotice): string {
  const service = notice.service ? ` (${clipForSms(notice.service, 24)})` : "";
  return (
    `Hi ${firstName(notice.customerName)}, your booking at ${clipForSms(notice.businessName, 24)}` +
    `${service} on ${notice.date} ${notice.time} is CONFIRMED. See you!`
  );
}

/**
 * `disabled` (the tenant switched customer texts off) is kept distinct from
 * `skipped` (this particular customer can't be texted) so the log says which.
 */
export type CustomerNotifyResult = "sent" | "failed" | "skipped" | "disabled";

/** The tenant's switch. Separate argument so it can never be confused with opt-out. */
export interface CustomerSmsSettings {
  notifyCustomerSms: boolean;
}

async function send(
  settings: CustomerSmsSettings,
  customer: TextableCustomer,
  notice: CustomerBookingNotice,
  body: string,
  label: string,
): Promise<CustomerNotifyResult> {
  // Checked BEFORE the opt-out guard only for reporting clarity; neither can
  // override the other. Both must pass.
  if (!settings.notifyCustomerSms) return "disabled";
  if (!canTextCustomer(customer)) return "skipped";
  try {
    const result = await getSmsSender().send(
      customer.mobile as string,
      body,
      // This one matters most: it's the text a CUSTOMER receives, and a booking
      // confirmation from "RoniesBarber" is recognised where one from a random
      // shortcode is ignored or reported as spam.
      { senderId: notice.smsSenderId ?? undefined },
    );
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error(`[customer:${label}]`, error);
    return "failed";
  }
}

export function notifyCustomerBookingReceived(
  settings: CustomerSmsSettings,
  customer: TextableCustomer,
  notice: CustomerBookingNotice,
): Promise<CustomerNotifyResult> {
  return send(
    settings,
    customer,
    notice,
    bookingReceivedSms(notice),
    "booking-received",
  );
}

export function notifyCustomerBookingConfirmed(
  settings: CustomerSmsSettings,
  customer: TextableCustomer,
  notice: CustomerBookingNotice,
): Promise<CustomerNotifyResult> {
  return send(
    settings,
    customer,
    notice,
    bookingConfirmedSms(notice),
    "booking-confirmed",
  );
}

/* ── The same two moments, in writing ──────────────────────────────────────
 *
 * Email was added after the texts, and it is a SECOND channel rather than a
 * replacement: the SMS is what reaches someone standing in a queue, the email
 * is the copy they still have next week when the text has scrolled away. Both
 * are best-effort and independent — an opted-out number still gets the mail,
 * and someone who gave no address still gets the text.
 *
 * The address is optional on a booking (see schemas/booking.ts), so "no email
 * given" is the ordinary case and reports `skipped`, not a failure.
 */

/** What the customer is reachable at, beyond their phone. */
export interface MailableCustomer {
  email: string | null;
}

function when(notice: CustomerBookingNotice): string {
  return `${notice.date} at ${notice.time}`;
}

export function bookingReceivedEmailSubject(
  notice: CustomerBookingNotice,
): string {
  return `We have your request - ${notice.businessName}`;
}

export function bookingConfirmedEmailSubject(
  notice: CustomerBookingNotice,
): string {
  return `Confirmed: ${when(notice)} - ${notice.businessName}`;
}

/**
 * Received, not confirmed \u2014 and the copy has to be honest about that.
 *
 * The owner has not accepted anything yet. A mail that reads like a
 * confirmation at this stage is the one that makes someone turn up to a slot
 * nobody kept for them.
 */
export function bookingReceivedEmailText(notice: CustomerBookingNotice): string {
  return [
    `Hi ${firstName(notice.customerName)},`,
    "",
    `Thanks for your request with ${notice.businessName}. We have it, and we will confirm shortly.`,
    "",
    `What:  ${notice.service ?? "Appointment"}`,
    `When:  ${when(notice)}`,
    "",
    "This is a request, not a confirmed booking yet. We will be in touch to confirm the time.",
    "",
    `- ${notice.businessName}`,
  ].join("\n");
}

export function bookingConfirmedEmailText(
  notice: CustomerBookingNotice,
): string {
  return [
    `Hi ${firstName(notice.customerName)},`,
    "",
    `Your booking with ${notice.businessName} is confirmed.`,
    "",
    `What:  ${notice.service ?? "Appointment"}`,
    `When:  ${when(notice)}`,
    "",
    "If you need to change or cancel, just reply to this email.",
    "",
    `- ${notice.businessName}`,
  ].join("\n");
}

async function sendMail(
  business: MailSettings,
  customer: MailableCustomer,
  notice: CustomerBookingNotice,
  subject: string,
  text: string,
  label: string,
): Promise<CustomerNotifyResult> {
  if (!customer.email) return "skipped";

  try {
    const result = await getEmailSender().send({
      to: customer.email,
      subject,
      text,
      fromName: tenantSenderName(business),
      /*
       * The tenant's own booking address when they have a verified domain.
       * A confirmation arriving from an agency domain the customer has never
       * heard of reads as phishing, which is the whole reason this exists.
       */
      fromAddress: tenantSenderAddress(business, "booking"),
      // "Reply to change or cancel" is only true if a reply reaches the owner.
      replyTo: business.notifyEmail ?? business.email ?? undefined,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error(`[customer:${label}:email]`, error);
    return "failed";
  }
}

/** What `sendMail` needs off the business, and nothing more. */
export type MailSettings = Parameters<typeof tenantSenderName>[0] &
  Parameters<typeof tenantSenderAddress>[0] & {
    notifyEmail: string | null;
    email: string | null;
  };

export function emailCustomerBookingReceived(
  business: MailSettings,
  customer: MailableCustomer,
  notice: CustomerBookingNotice,
): Promise<CustomerNotifyResult> {
  return sendMail(
    business,
    customer,
    notice,
    bookingReceivedEmailSubject(notice),
    bookingReceivedEmailText(notice),
    "booking-received",
  );
}

export function emailCustomerBookingConfirmed(
  business: MailSettings,
  customer: MailableCustomer,
  notice: CustomerBookingNotice,
): Promise<CustomerNotifyResult> {
  return sendMail(
    business,
    customer,
    notice,
    bookingConfirmedEmailSubject(notice),
    bookingConfirmedEmailText(notice),
    "booking-confirmed",
  );
}
