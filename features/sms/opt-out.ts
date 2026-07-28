import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Inbound opt-out / opt-in handling, keyed by phone number across ALL tenants.
 *
 * Runs with the service-role client (bypasses RLS) because an inbound "STOP"
 * arrives with only a phone number — it isn't scoped to one tenant, and the same
 * person may be a customer of several businesses. Numbers are stored E.164 (see
 * lib/sms/phone), matching Twilio's `From`.
 */

/** STOP: mark the customer opted out everywhere and cancel their queued texts. */
export async function applyOptOut(
  supabase: SupabaseClient<Database>,
  mobile: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from("customers")
    .update({ sms_status: "opted_out", sms_opted_out_at: now })
    .eq("mobile", mobile)
    .is("deleted_at", null);

  // Stop anything already queued to this number.
  await supabase
    .from("review_messages")
    .update({ status: "cancelled" })
    .eq("to_mobile", mobile)
    .eq("status", "queued");
}

/** START: re-subscribe a previously opted-out number. */
export async function applyOptIn(
  supabase: SupabaseClient<Database>,
  mobile: string,
): Promise<void> {
  await supabase
    .from("customers")
    .update({ sms_status: "not_sent", sms_opted_out_at: null })
    .eq("mobile", mobile)
    .eq("sms_status", "opted_out")
    .is("deleted_at", null);
}
