import type { Business } from "@/types/business-entity";

/**
 * Which address a tenant's mail goes out as, for one purpose.
 *
 * The platform sends for many businesses. By default that is from ONE address
 * it controls (`EMAIL_FROM`) with the business name as the display name — see
 * the long note on `EmailMessage.fromName`, which explains why letting
 * client-edited data choose the whole From header is a header-injection hole.
 *
 * A tenant who has brought their own domain is the exception, and migration
 * 0043 is what makes it safe: the platform verifies the DOMAIN's DNS, a
 * database trigger stops an owner marking it verified themselves, and a check
 * constraint holds every purpose address on that domain. So by the time a
 * value reaches this function it is on a domain the platform vouched for.
 *
 * WHY PER PURPOSE. A client asks for enquiries to come from hello@ and
 * bookings from booking@ — the two land in different mailboxes and get read by
 * different people. One address per tenant cannot express that, and one
 * address per feature would verify the same domain three times.
 *
 * Null is the ordinary answer, not a failure: it means "use the platform's
 * address", which is right for every tenant who has not brought a domain.
 */
export type SenderPurpose = "enquiry" | "booking" | "newsletter";

export function tenantSenderAddress(
  business: Pick<
    Business,
    | "senderVerified"
    | "senderEnquiryEmail"
    | "senderBookingEmail"
    | "senderNewsletterEmail"
  >,
  purpose: SenderPurpose,
): string | undefined {
  // The gate, and the only one. An unverified domain is a domain someone
  // typed; sending from it would be sending as a domain we never checked.
  if (!business.senderVerified) return undefined;

  const address =
    purpose === "enquiry"
      ? business.senderEnquiryEmail
      : purpose === "booking"
        ? business.senderBookingEmail
        : business.senderNewsletterEmail;

  return address ?? undefined;
}

/**
 * The display name to put on it.
 *
 * `senderFromName` when the tenant set one, otherwise the business name —
 * which is what every tenant mail used before this existed, so a tenant who
 * never touches the field sees no change.
 */
export function tenantSenderName(
  business: Pick<Business, "senderFromName" | "name">,
): string {
  return business.senderFromName?.trim() || business.name;
}
