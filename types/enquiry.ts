/**
 * A question asked of a tenant through their website.
 *
 * Distinct from an Appointment (someone booking a time) and from a Lead
 * (someone contacting the agency). See migration 0036 for why it is neither.
 */
export interface Enquiry {
  id: string;
  businessId: string;
  name: string;
  /** At least one of email/phone is always present — the DB enforces it. */
  email: string | null;
  phone: string | null;
  /** What it is about, from the template's own list. */
  topic: string | null;
  message: string;
  /** When the owner opened it. Null = unread. */
  readAt: string | null;
  createdAt: string;
}
