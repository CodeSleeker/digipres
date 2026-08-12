import { getOwnerContext } from "@/lib/tenant/business-context";
import { EnquiryRepository } from "@/repositories/enquiry-repository";
import type { Enquiry } from "@/types/enquiry";

/** This owner's enquiries, newest first. Empty before onboarding creates one. */
export async function getEnquiries(): Promise<Enquiry[]> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return [];
  return new EnquiryRepository(supabase).list(businessId);
}

/**
 * The sidebar badge.
 *
 * Never throws: it runs in the admin LAYOUT, on every page, so a transient
 * database error here would take out the whole back office to fail to draw a
 * number. Zero is the honest answer when we can't count.
 */
export async function getUnreadEnquiryCount(): Promise<number> {
  try {
    const { supabase, businessId } = await getOwnerContext();
    if (!businessId) return 0;
    return await new EnquiryRepository(supabase).unreadCount(businessId);
  } catch (error) {
    console.error("[enquiries:unread]", error);
    return 0;
  }
}
