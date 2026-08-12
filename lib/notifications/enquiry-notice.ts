import type { Business } from "@/types/business-entity";
import { getSmsSender } from "@/lib/sms/sender";
import { toE164 } from "@/lib/sms/phone";
import { getEmailSender } from "@/lib/email/sender";
import { clipForSms } from "@/lib/sms/gsm7";
import { alertContacts } from "@/lib/notifications/booking-notice";
import { platformBaseUrl } from "@/lib/tenant/urls";

/**
 * Telling the owner someone asked them a question.
 *
 * Two channels, both best-effort, exactly as for a booking — and reusing that
 * module's `alertContacts` so an owner configures their alert destinations
 * once and both kinds of message follow them.
 */

export interface EnquiryNotice {
  enquiryId: string;
  name: string;
  email: string | null;
  phone: string | null;
  topic: string | null;
  message: string;
}

export interface NotifyResult {
  sms: "sent" | "failed" | "skipped";
  email: "sent" | "failed" | "skipped";
}

/** Deep link to the enquiry in the owner's dashboard. */
export function enquiryUrl(): string {
  const base = platformBaseUrl() ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/admin/enquiries`;
}

/**
 * ONE 160-character GSM-7 segment, which is one credit.
 *
 * The same three rules that keep the booking SMS to one segment apply here and
 * are just as load-bearing:
 *
 *  - No em dash, and no curly quotes. A single non-GSM-7 character forces UCS-2
 *    and cuts the segment from 160 characters to 70.
 *  - No dashboard link. A URL is around 79 characters — half the budget — and
 *    the owner gets it in the email. An SMS's job is only to say "go look".
 *  - Every interpolated value is clipped, because they are typed by a stranger
 *    and a long name would otherwise silently add a segment.
 *
 * The message itself is clipped hard rather than omitted: most questions are
 * one line, and the first few words are usually enough for an owner to know
 * whether to stop what they are doing.
 */
export function enquirySmsBody(
  businessName: string,
  notice: EnquiryNotice,
): string {
  const contact = notice.phone ?? notice.email ?? "";
  return [
    `New question - ${clipForSms(businessName, 22)}`,
    `${clipForSms(notice.name, 22)} ${clipForSms(contact, 28)}`,
    clipForSms(notice.message, 70),
  ].join("\n");
}

export function enquiryEmailSubject(notice: EnquiryNotice): string {
  const about = notice.topic ? `: ${notice.topic}` : "";
  return `New question from ${notice.name}${about}`;
}

export function enquiryEmailText(
  businessName: string,
  notice: EnquiryNotice,
): string {
  const lines = [
    `${businessName} — someone asked a question through your website.`,
    "",
    `From:  ${notice.name}`,
    `Email: ${notice.email ?? "not given"}`,
    `Phone: ${notice.phone ?? "not given"}`,
  ];
  if (notice.topic) lines.push(`About: ${notice.topic}`);
  lines.push("", notice.message, "", `Open your enquiries: ${enquiryUrl()}`);
  return lines.join("\n");
}

/**
 * Send the SMS and the email, and never throw.
 *
 * The caller is the public enquiry route, where the row is ALREADY saved by the
 * time this runs. A provider outage or an owner with no phone on file must not
 * turn a delivered question into an error for the person who asked it — they
 * did nothing wrong, and retrying would send it twice. Failures are logged and
 * reported in the return value instead.
 */
export async function notifyOwnerOfEnquiry(
  business: Business,
  notice: EnquiryNotice,
): Promise<NotifyResult> {
  const [sms, email] = await Promise.all([
    sendSms(business, notice),
    sendEmail(business, notice),
  ]);
  return { sms, email };
}

async function sendSms(
  business: Business,
  notice: EnquiryNotice,
): Promise<NotifyResult["sms"]> {
  const number = alertContacts(business).phone;
  const to = number ? toE164(number) : null;
  if (!to) return "skipped";

  try {
    const result = await getSmsSender().send(
      to,
      enquirySmsBody(business.name, notice),
      // The sender ID registered with the carrier for this business, NOT its
      // name — see migration 0028. Ignored by Twilio, which has no such field.
      { senderId: business.smsSenderId ?? undefined },
    );
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[enquiry:sms]", error);
    return "failed";
  }
}

async function sendEmail(
  business: Business,
  notice: EnquiryNotice,
): Promise<NotifyResult["email"]> {
  const to = alertContacts(business).email;
  if (!to) return "skipped";

  try {
    const result = await getEmailSender().send({
      to,
      subject: enquiryEmailSubject(notice),
      text: enquiryEmailText(business.name, notice),
      /*
       * From the BUSINESS, replying to the ASKER.
       *
       * The owner sees their own name in the sender column, and hitting reply
       * goes to the person with the question rather than to the platform —
       * which is the entire action this email exists to prompt.
       */
      fromName: business.name,
      replyTo: notice.email ?? undefined,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[enquiry:email]", error);
    return "failed";
  }
}
