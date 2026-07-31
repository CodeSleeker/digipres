import type { Business } from "@/types/business-entity";
import { getSmsSender } from "@/lib/sms/sender";
import { toE164 } from "@/lib/sms/phone";
import { getEmailSender } from "@/lib/email/sender";
import { platformBaseUrl } from "@/lib/tenant/urls";

/**
 * Telling the owner a customer just booked.
 *
 * Two channels, both best-effort. The dashboard's live update (Supabase
 * Realtime) is the third and needs no code here — it is driven by the row
 * insert itself.
 */

export interface BookingNotice {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  service: string;
  staff: string | null;
  /** Requested day, YYYY-MM-DD. */
  date: string;
  /** Requested time, HH:mm, as the customer's own wall clock. */
  time: string;
  notes: string | null;
}

export interface NotifyResult {
  sms: "sent" | "failed" | "skipped";
  email: "sent" | "failed" | "skipped";
}

/** Deep link to the booking in the owner's dashboard. */
export function appointmentUrl(appointmentId: string): string {
  const base = platformBaseUrl() ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/admin/appointments/${appointmentId}/edit`;
}

/**
 * Kept short on purpose: an SMS segment is 160 GSM-7 characters and every extra
 * segment is another charge on every booking. Name, service and day are what
 * the owner needs to decide whether to act now; the link carries the rest.
 */
export function bookingSmsBody(
  businessName: string,
  notice: BookingNotice,
): string {
  const staff = notice.staff ? ` with ${notice.staff}` : "";
  return [
    `New booking — ${businessName}`,
    `${notice.customerName} (${notice.customerPhone})`,
    `${notice.service}${staff}`,
    `${notice.date} at ${notice.time}`,
    appointmentUrl(notice.appointmentId),
  ].join("\n");
}

export function bookingEmailSubject(notice: BookingNotice): string {
  return `New booking: ${notice.customerName} — ${notice.service}, ${notice.date} ${notice.time}`;
}

export function bookingEmailText(
  businessName: string,
  notice: BookingNotice,
): string {
  const lines = [
    `${businessName} — new booking request from your website.`,
    "",
    `Customer: ${notice.customerName}`,
    `Phone:    ${notice.customerPhone}`,
    `Service:  ${notice.service}`,
    `Staff:    ${notice.staff ?? "Any available"}`,
    `When:     ${notice.date} at ${notice.time}`,
  ];
  if (notice.notes) lines.push("", `Notes: ${notice.notes}`);
  lines.push("", `Open the booking: ${appointmentUrl(notice.appointmentId)}`);
  return lines.join("\n");
}

/**
 * Send the SMS and the email, and never throw.
 *
 * The caller is the public booking route, where the booking is ALREADY saved by
 * the time this runs. A provider outage, an unverified sending domain or an
 * owner with no phone number on file must not turn a successful booking into an
 * error for the customer — they did nothing wrong and retrying would double-book
 * them. Failures are logged and reported in the return value instead.
 *
 * Destinations are the alert contacts the owner set (/admin/settings), falling
 * back to the public website ones. Falling back rather than requiring the alert
 * fields is what keeps every existing tenant working with nothing to fill in.
 */
export async function notifyOwnerOfBooking(
  business: Business,
  notice: BookingNotice,
): Promise<NotifyResult> {
  const [sms, email] = await Promise.all([
    sendSms(business, notice),
    sendEmail(business, notice),
  ]);
  return { sms, email };
}

/** Alert contacts, each falling back to the public one. Exported for testing. */
export function alertContacts(business: Business): {
  phone: string | null;
  email: string | null;
} {
  return {
    phone: business.notifyPhone ?? business.phone,
    email: business.notifyEmail ?? business.email,
  };
}

async function sendSms(
  business: Business,
  notice: BookingNotice,
): Promise<NotifyResult["sms"]> {
  const number = alertContacts(business).phone;
  const to = number ? toE164(number) : null;
  if (!to) return "skipped";

  try {
    const result = await getSmsSender().send(
      to,
      bookingSmsBody(business.name, notice),
      // Same reasoning as the email's fromName below: on a carrier that supports
      // alphanumeric senders the owner should see their own business, not the
      // platform. Ignored by Twilio, which has no such field.
      { senderId: business.name },
    );
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[booking:sms]", error);
    return "failed";
  }
}

async function sendEmail(
  business: Business,
  notice: BookingNotice,
): Promise<NotifyResult["email"]> {
  const to = alertContacts(business).email;
  if (!to) return "skipped";

  try {
    const result = await getEmailSender().send({
      to,
      subject: bookingEmailSubject(notice),
      text: bookingEmailText(business.name, notice),
      // The owner should see their OWN business in the sender column, not the
      // platform's name and certainly not another client's. Only the display
      // name varies; the address stays on the one verified domain.
      fromName: business.name,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[booking:email]", error);
    return "failed";
  }
}
