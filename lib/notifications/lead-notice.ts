import { getEmailSender } from "@/lib/email/sender";
import { getSmsSender } from "@/lib/sms/sender";
import { toE164 } from "@/lib/sms/phone";
import { clipForSms, toGsm7 } from "@/lib/sms/gsm7";
import type { NewLead } from "@/schemas/lead";

/**
 * Telling Aliamz Digital that someone enquired.
 *
 * Three channels, in order of how much they carry:
 *   database — the record, written by the caller BEFORE this runs
 *   email    — the full detail
 *   SMS      — a nudge to go and read the email
 *
 * Everything here is best-effort and nothing throws. The lead is already stored
 * by the time this is called, so a mail or carrier failure must not turn a
 * successful enquiry into an error for a stranger who did nothing wrong.
 */

export interface LeadAlertResult {
  email: "sent" | "failed" | "skipped";
  sms: "sent" | "failed" | "skipped";
}

export interface AlertDestinations {
  /** Consultation requests. */
  bookingEmail: string | null;
  /** Everything else from the contact form. */
  contactEmail: string | null;
  phone: string | null;
  senderId: string | null;
}

/**
 * Where the alerts go. Unset means that channel is simply off.
 *
 * Two inboxes because the two forms want different attention: a consultation
 * is a slot someone is waiting on an answer for, a general enquiry can sit in
 * the main inbox. Bookings FALL BACK to the general address rather than going
 * nowhere — a misconfigured booking inbox should still reach a human.
 */
export function alertDestinations(
  env: Record<string, string | undefined> = process.env,
): AlertDestinations {
  const contactEmail = env.PLATFORM_ALERT_EMAIL?.trim() || null;
  return {
    bookingEmail: env.PLATFORM_BOOKING_EMAIL?.trim() || contactEmail,
    contactEmail,
    phone: env.PLATFORM_ALERT_PHONE?.trim() || null,
    senderId: env.PLATFORM_SMS_SENDER_ID?.trim() || null,
  };
}

/** The inbox a given enquiry belongs in. */
export function alertEmailFor(
  kind: NewLead["kind"],
  env: Record<string, string | undefined> = process.env,
): string | null {
  const to = alertDestinations(env);
  return kind === "consultation" ? to.bookingEmail : to.contactEmail;
}

const LABEL: Record<NewLead["kind"], string> = {
  consultation: "consultation request",
  contact: "enquiry",
};

export function leadEmailSubject(lead: NewLead): string {
  return `New ${LABEL[lead.kind]}: ${lead.name}`;
}

export function leadEmailText(lead: NewLead): string {
  const lines = [
    `New ${LABEL[lead.kind]} from the website.`,
    "",
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    `Phone:   ${lead.phone ?? "—"}`,
  ];

  if (lead.kind === "consultation") {
    lines.push(
      `Looking for: ${lead.projectType ?? "—"}`,
      `Preferred:   ${[lead.preferredDate, lead.preferredTime]
        .filter(Boolean)
        .join(" at ") || "no preference given"}`,
    );
  }

  if (lead.message) lines.push("", "Message:", lead.message);
  // Reply-To is set on the message, so Reply already goes to them. The address
  // stays in the body for the case where it was stripped as unsafe.
  lines.push("", `Reply to this email to reach ${lead.name} directly.`);
  return lines.join("\n");
}

/**
 * Deliberately tiny: it says WHAT happened and WHERE to read it, nothing more.
 *
 * One GSM-7 segment, which is one credit. Putting the email address, phone
 * number and message in here would cost three or four per enquiry and duplicate
 * an email already sitting on the same phone.
 *
 * The name is clipped AND transliterated. Clipping alone is not enough: the
 * name comes from a stranger, and one curly apostrophe — which phones and Word
 * produce by default — forces the whole message to UCS-2 and doubles the cost.
 * The providers downgrade at the send boundary anyway, but doing it here means
 * the body this function returns is the body that goes out, whichever carrier
 * is configured.
 */
export function leadSmsBody(lead: NewLead): string {
  const name = toGsm7(clipForSms(lead.name, 32));
  return `New ${LABEL[lead.kind]} from ${name}. Check your email for the details.`;
}

export async function notifyNewLead(lead: NewLead): Promise<LeadAlertResult> {
  const to = alertDestinations();
  const [email, sms] = await Promise.all([
    sendEmail(lead, alertEmailFor(lead.kind)),
    sendSms(lead, to.phone, to.senderId),
  ]);
  return { email, sms };
}

async function sendEmail(
  lead: NewLead,
  to: string | null,
): Promise<LeadAlertResult["email"]> {
  if (!to) return "skipped";
  try {
    const result = await getEmailSender().send({
      to,
      subject: leadEmailSubject(lead),
      text: leadEmailText(lead),
      fromName: "Aliamz Digital",
      // Hitting Reply in the bookings inbox goes to the person who enquired,
      // not back to the platform's own sending address.
      replyTo: lead.email,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[lead:email]", error);
    return "failed";
  }
}

async function sendSms(
  lead: NewLead,
  to: string | null,
  senderId: string | null,
): Promise<LeadAlertResult["sms"]> {
  const number = to ? toE164(to) : null;
  if (!number) return "skipped";
  try {
    const result = await getSmsSender().send(number, leadSmsBody(lead), {
      // This alert belongs to the platform, not to any tenant, so there is no
      // businesses.sms_sender_id to read — hence the one env var. Optional:
      // Semaphore falls back to the account default, PhilSMS declines.
      senderId: senderId ?? undefined,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[lead:sms]", error);
    return "failed";
  }
}
