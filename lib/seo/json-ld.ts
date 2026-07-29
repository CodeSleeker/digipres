import type { Business } from "@/types/business-entity";
import type { BusinessCategory } from "@/types/business-entity";

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

/** Map our category to the most specific schema.org LocalBusiness subtype. */
const CATEGORY_TYPE: Record<BusinessCategory, string> = {
  barber: "HairSalon",
  salon: "HairSalon",
  spa: "DaySpa",
  clinic: "MedicalClinic",
  dental: "Dentist",
  construction: "GeneralContractor",
  restaurant: "Restaurant",
  cafe: "CafeOrCoffeeShop",
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
  if (business.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: business.address,
    };
  }

  const image = business.coverImageUrl ?? business.logoUrl;
  if (image) data.image = image;
  if (business.logoUrl) data.logo = business.logoUrl;

  const sameAs = [
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
