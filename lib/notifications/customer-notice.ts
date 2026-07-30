import { getSmsSender } from "@/lib/sms/sender";
import { isE164 } from "@/lib/sms/phone";

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
 * Kept to roughly one SMS segment (160 GSM-7 characters) where the business
 * name allows. Every extra segment is charged on every booking, and these go to
 * customers rather than the owner, so the volume is whatever the site attracts.
 */
export function bookingReceivedSms(notice: CustomerBookingNotice): string {
  const service = notice.service ? ` for ${notice.service}` : "";
  return (
    `Hi ${firstName(notice.customerName)}, thanks! ${notice.businessName} has your booking request` +
    `${service} on ${notice.date} at ${notice.time}. We'll text you once it's confirmed.`
  );
}

export function bookingConfirmedSms(notice: CustomerBookingNotice): string {
  const service = notice.service ? ` (${notice.service})` : "";
  return (
    `Hi ${firstName(notice.customerName)}, your booking at ${notice.businessName}` +
    `${service} is CONFIRMED for ${notice.date} at ${notice.time}. See you then!`
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
  body: string,
  label: string,
): Promise<CustomerNotifyResult> {
  // Checked BEFORE the opt-out guard only for reporting clarity; neither can
  // override the other. Both must pass.
  if (!settings.notifyCustomerSms) return "disabled";
  if (!canTextCustomer(customer)) return "skipped";
  try {
    const result = await getSmsSender().send(customer.mobile as string, body);
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
    bookingConfirmedSms(notice),
    "booking-confirmed",
  );
}
