import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Business } from "@/types/business-entity";
import { getEmailSender } from "@/lib/email/sender";
import { getSmsSender } from "@/lib/sms/sender";
import { isE164, toE164 } from "@/lib/sms/phone";
import { clipForSms } from "@/lib/sms/gsm7";
import { alertContacts } from "@/lib/notifications/booking-notice";
import {
  tenantSenderAddress,
  tenantSenderName,
} from "@/lib/email/tenant-sender";

/**
 * Telling the PERSON WHO ASKED that their enquiry arrived.
 *
 * The counterpart to enquiry-notice.ts, which tells the owner. Someone who has
 * just filled in a long form and pressed send has no way of knowing it worked
 * beyond a panel that disappears when they close the tab — so this is the
 * receipt, and it carries the same reference the panel showed them.
 *
 * Both channels are best-effort and neither throws. The enquiry is already
 * saved by the time this runs, and a provider outage must not turn a delivered
 * enquiry into an error for someone who did nothing wrong.
 *
 * WHY THIS IS NOT PART OF customer-notice.ts. That module texts a CUSTOMER
 * about an appointment: it needs a customer record, a booking, and a date.
 * An enquirer has none of those — migration 0036 exists precisely because a
 * question is not a booking. The shared part is the opt-out rule, and that is
 * shared by reading the same column rather than by sharing a module.
 */

export interface EnquiryAck {
  /** The code the success panel showed them, so the mail matches the screen. */
  reference: string;
  name: string;
  email: string | null;
  phone: string | null;
  topic: string | null;
}

/**
 * `disabled` (the tenant switched customer texts off) is kept distinct from
 * `skipped` (this person cannot be texted at all), so the log says which.
 */
export type AckChannelResult = "sent" | "failed" | "skipped" | "disabled";

export interface EnquiryAckResult {
  email: AckChannelResult;
  sms: AckChannelResult;
}

/** "Juan Dela Cruz" -> "Juan". Addressing someone by their full legal name reads oddly. */
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full.trim();
}

/**
 * The text they get, inside one GSM-7 segment.
 *
 * The constraints are the owner alert's, for the same reasons (see
 * enquirySmsBody): no em dash and no curly quotes, or a single character drops
 * the budget from 160 to 70; no URL, which would eat half of it; and every
 * interpolated value clipped, because the name is typed by a stranger.
 *
 * The reference is the one thing here that is not decoration. It is what they
 * quote back on Messenger or the phone, and it is the reason this text is
 * worth sending at all rather than just an email.
 */
export function enquiryAckSms(businessName: string, ack: EnquiryAck): string {
  return [
    `Hi ${clipForSms(firstName(ack.name), 18)}, thanks for your enquiry.`,
    `Ref ${clipForSms(ack.reference, 20)}.`,
    `We will reply within one working day.`,
    `- ${clipForSms(businessName, 24)}`,
  ].join(" ");
}

export function enquiryAckEmailSubject(
  businessName: string,
  ack: EnquiryAck,
): string {
  return `We have your enquiry (${ack.reference}) - ${businessName}`;
}

/**
 * Plain text, like every other mail this platform sends.
 *
 * It says three things and stops: we have it, here is your reference, here is
 * when to expect us. It deliberately does NOT repeat everything they typed —
 * they filled the form seconds ago, and a wall of their own answers reads like
 * a database dump rather than a reply from a person.
 */
export function enquiryAckEmailText(
  businessName: string,
  ack: EnquiryAck,
): string {
  const lines = [
    `Hi ${firstName(ack.name)},`,
    "",
    `Thanks for getting in touch with ${businessName}. Your enquiry has arrived and we will come back to you within one working day.`,
    "",
    `Your reference: ${ack.reference}`,
  ];

  if (ack.topic) lines.push(`About: ${ack.topic}`);

  lines.push(
    "",
    "Quote that reference if you carry on the conversation by phone or message and we will pick up where you left off.",
    "",
    `- ${businessName}`,
  );
  return lines.join("\n");
}

/**
 * Has this number told anyone to stop texting it?
 *
 * Opt-out is recorded on `customers.sms_status` and applied across EVERY
 * tenant (features/sms/opt-out updates by mobile with no business filter), so
 * the question is deliberately asked the same way: any non-deleted customer
 * row on this number, belonging to anyone.
 *
 * An enquirer usually has no customer record at all, which is exactly why this
 * cannot reuse `canTextCustomer` — that reads a record we do not have. A
 * failed lookup returns TRUE (treat as opted out): being unable to check is
 * not permission to send.
 */
export async function isNumberOptedOut(
  supabase: SupabaseClient<Database>,
  mobile: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .eq("sms_status", "opted_out")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    console.error("[enquiry:ack:optout]", error);
    return true;
  }
}

async function sendEmail(
  business: Business,
  ack: EnquiryAck,
): Promise<AckChannelResult> {
  if (!ack.email) return "skipped";

  try {
    const result = await getEmailSender().send({
      to: ack.email,
      subject: enquiryAckEmailSubject(business.name, ack),
      text: enquiryAckEmailText(business.name, ack),
      // Their own business in the sender column, never the platform's.
      fromName: tenantSenderName(business),
      /*
       * And their own ADDRESS when they have brought a verified domain —
       * hello@theirdomain rather than the platform's. Undefined falls back to
       * EMAIL_FROM, which is the right answer for a tenant without one.
       *
       * It matters more here than on an owner alert: this is the one mail a
       * member of the public receives, and a booking receipt arriving from an
       * agency domain they have never heard of reads as phishing.
       */
      fromAddress: tenantSenderAddress(business, "enquiry"),
      /*
       * Reply goes to the OWNER, not to the platform.
       *
       * This is the one mail in the system a member of the public receives and
       * is likely to answer — "actually, can we make it the 14th?" — and
       * without this that reply lands in the platform's mailbox where nobody
       * is looking for it.
       */
      replyTo: alertContacts(business).email ?? undefined,
    });
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[enquiry:ack:email]", error);
    return "failed";
  }
}

async function sendSms(
  supabase: SupabaseClient<Database>,
  business: Business,
  ack: EnquiryAck,
): Promise<AckChannelResult> {
  // The tenant's own switch, and the same one that governs booking texts: an
  // owner who turned off texting the people who contact them meant all of it.
  if (!business.notifyCustomerSms) return "disabled";

  const to = ack.phone ? toE164(ack.phone) : null;
  if (!to || !isE164(to)) return "skipped";
  if (await isNumberOptedOut(supabase, to)) return "skipped";

  try {
    const result = await getSmsSender().send(
      to,
      enquiryAckSms(business.name, ack),
      {
        // The label the carrier shows. A reply from "EleganceByBem" is
        // recognised; one from a random shortcode is reported as spam.
        senderId: business.smsSenderId ?? undefined,
      },
    );
    return result.success ? "sent" : "failed";
  } catch (error) {
    console.error("[enquiry:ack:sms]", error);
    return "failed";
  }
}

/**
 * Send the receipt. Never throws.
 *
 * Both channels are attempted independently: someone who gave only an email
 * gets only the mail, and a number that has opted out still gets the mail. The
 * schema guarantees at least one of the two, so this always has somewhere to
 * go \u2014 but it reports per channel rather than assuming.
 */
export async function acknowledgeEnquiry(
  supabase: SupabaseClient<Database>,
  business: Business,
  ack: EnquiryAck,
): Promise<EnquiryAckResult> {
  const [email, sms] = await Promise.all([
    sendEmail(business, ack),
    sendSms(supabase, business, ack),
  ]);
  return { email, sms };
}
