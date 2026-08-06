import type { Business } from "@/types/business-entity";
import type { BusinessCategory } from "@/types/business-entity";
import type { FaqItem } from "@/types/business";
import { postalAddress } from "@/lib/businesses/address";

/**
 * Build a schema.org FAQPage node from the questions a tenant has published.
 *
 * Returns null when there is nothing to describe. That gate is not tidiness:
 * Google's structured-data policy requires FAQ markup to correspond to content
 * visible on the page, and an empty or hidden FAQPage is a documented
 * violation. The caller passes the SAME array the template renders, so the two
 * cannot drift.
 *
 * Worth being straight about the payoff: Google restricted FAQ RICH RESULTS in
 * August 2023 to authoritative government and health sites, so this will not
 * produce expandable snippets in ordinary search. It remains valid structured
 * data, and it is the form AI answer engines quote from most readily — which is
 * the reason it is here.
 *
 * `acceptedAnswer.text` may contain HTML per the spec, but we emit the owner's
 * plain text unchanged: the value is JSON-encoded into a script tag by
 * components/json-ld, and inventing markup would only create a second
 * representation to keep in sync with the page.
 */
export function buildFaqJsonLd(
  items: FaqItem[],
): Record<string, unknown> | null {
  const questions = items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (!questions.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer.trim(),
      },
    })),
  };
}

/** 0 = Sunday … 6 = Saturday → schema.org day names. */
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Map our category to the most specific schema.org LocalBusiness subtype.
 *
 * `Record<BusinessCategory, …>` is doing real work: it makes the compiler
 * refuse a new category that nobody gave a type to, which would otherwise
 * publish silently as a generic LocalBusiness. Exported so a test can use its
 * keys as the authoritative full set.
 */
export const CATEGORY_TYPE: Record<BusinessCategory, string> = {
  barber: "HairSalon",
  salon: "HairSalon",
  spa: "DaySpa",
  clinic: "MedicalClinic",
  dental: "Dentist",
  construction: "GeneralContractor",
  restaurant: "Restaurant",
  cafe: "CafeOrCoffeeShop",
  // A real schema.org type, and the one Google's own examples use for this
  // trade — distinct from CafeOrCoffeeShop, which claims a place to sit and
  // drink coffee.
  bakery: "Bakery",
  retail: "Store",
  automotive: "AutomotiveBusiness",
  fitness: "HealthClub",
  other: "LocalBusiness",
};

/**
 * Build a schema.org LocalBusiness node (a subtype of Organization, so it
 * satisfies both "Schema.org" and "LocalBusiness" structured-data needs) from a
 * tenant's business record. Only includes fields that are present; geo is
 * omitted until coordinates are captured.
 */
export function buildLocalBusinessJsonLd(
  business: Business,
  url: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": CATEGORY_TYPE[business.category] ?? "LocalBusiness",
    name: business.name,
    url,
  };

  if (business.description) data.description = business.description;
  if (business.phone) data.telephone = business.phone;
  if (business.email) data.email = business.email;
  /**
   * The full PostalAddress, not just a street line.
   *
   * `addressLocality` is the load-bearing one: without it nothing on the page
   * says which town this is, and a parser answering "barber in Cagayan de Oro"
   * has to guess it out of prose. Coordinates matter far less — Google takes
   * those from the verified Business Profile.
   */
  const address = postalAddress(business);
  if (address) data.address = address;

  const image = business.coverImageUrl ?? business.logoUrl;
  if (image) data.image = image;
  if (business.logoUrl) data.logo = business.logoUrl;

  /**
   * `sameAs` is how a machine is told "this page and those profiles are the
   * same entity". The Google link matters most of the set: it is what connects
   * the website to the Business Profile that actually answers "near me"
   * searches, and it was the one link being collected (onboarding step 8) and
   * then not published.
   *
   * It is a leave-a-review deep link rather than the plain listing URL, which
   * is a shade less canonical — but it is keyed to the same place, so it still
   * identifies the entity unambiguously. Capturing the profile URL itself would
   * be marginally better and needs a field we don't have yet.
   */
  const sameAs = [
    business.googleReviewUrl,
    business.facebookUrl,
    business.instagramUrl,
    business.tiktokUrl,
    business.websiteUrl,
  ].filter((v): v is string => Boolean(v));
  if (sameAs.length) data.sameAs = sameAs;

  const openingHours = business.hours
    .filter((h) => !h.closed && h.open && h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[h.day],
      opens: h.open,
      closes: h.close,
    }));
  if (openingHours.length) data.openingHoursSpecification = openingHours;

  return data;
}
