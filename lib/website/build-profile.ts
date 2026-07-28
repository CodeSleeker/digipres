import type {
  BusinessProfile,
  Contact,
  ContactDetail,
  SocialLink,
} from "@/types/business";
import type { Business, BusinessHours } from "@/types/business-entity";

/**
 * Merge a database Business over the template's default profile to produce the
 * BusinessProfile the public template renders.
 *
 * Rules:
 *  - The six editable sections come from the stored content when present, else
 *    the default (so an un-customized site still renders).
 *  - Contact details and footer socials are DERIVED from the scalar business
 *    columns (phone/address/hours/socials) rather than duplicated in JSON.
 *  - Non-editable sections (header/nav/marquee/craft/barbers/products/
 *    testimonials/ctaBanner) are left as the default.
 */
export function buildBusinessProfile(
  base: BusinessProfile,
  business: Business,
): BusinessProfile {
  const { content } = business;

  return {
    ...base,
    brand: resolveBrand(base, business),
    seo: {
      title: business.name || base.seo.title,
      description: business.description ?? base.seo.description,
    },
    hero: content.hero ?? base.hero,
    about: content.about ?? base.about,
    services: content.services ?? base.services,
    gallery: content.gallery ?? base.gallery,
    contact: buildContact(base, business),
    footer: buildFooter(base, business),
  };
}

/**
 * The wordmark, in order of preference:
 *   1. an explicit `brand` override on the business,
 *   2. derived from the business name — "Ronies Barber" → RONIES / BARBER / R,
 *   3. the template's own default.
 *
 * Step 2 matters: without it every tenant on a template inherits the demo
 * content's branding, so a second barber would be labelled as the first.
 */
export function resolveBrand(
  base: BusinessProfile,
  business: Business,
): BusinessProfile["brand"] {
  const override = business.brand;
  if (override?.namePrimary) {
    return {
      namePrimary: override.namePrimary,
      nameAccent: override.nameAccent ?? "",
      initial: override.initial || override.namePrimary[0]!.toUpperCase(),
    };
  }
  return deriveBrand(business.name) ?? base.brand;
}

/** Split a business name into the two-tone wordmark, or null if unusable. */
export function deriveBrand(name: string): BusinessProfile["brand"] | null {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const initial = words[0]![0]!.toUpperCase();
  if (words.length === 1) {
    return { namePrimary: words[0]!.toUpperCase(), nameAccent: "", initial };
  }
  return {
    namePrimary: words.slice(0, -1).join(" ").toUpperCase(),
    nameAccent: words[words.length - 1]!.toUpperCase(),
    initial,
  };
}

function buildContact(base: BusinessProfile, business: Business): Contact {
  const c = business.content.contact;
  return {
    label: c?.label ?? base.contact.label,
    titleLines: c?.titleLines ?? base.contact.titleLines,
    intro: c?.intro ?? base.contact.intro,
    details: buildContactDetails(base, business),
    serviceOptions: c?.serviceOptions ?? base.contact.serviceOptions,
    barberOptions: c?.barberOptions ?? base.contact.barberOptions,
  };
}

/** Derive the LOCATION/HOURS/PHONE/SOCIALS detail cards from scalar columns. */
function buildContactDetails(
  base: BusinessProfile,
  business: Business,
): ContactDetail[] {
  const details: ContactDetail[] = [];

  if (business.address) {
    details.push({
      icon: "📍",
      title: "LOCATION",
      lines: [business.name, business.address].filter(Boolean) as string[],
    });
  }

  const hourLines = formatHours(business.hours);
  if (hourLines.length) {
    details.push({ icon: "🕐", title: "HOURS", lines: hourLines });
  }

  if (business.phone) {
    details.push({ icon: "📱", title: "PHONE", lines: [business.phone] });
  }

  const platforms: string[] = [];
  if (business.facebookUrl) platforms.push("Facebook");
  if (business.instagramUrl) platforms.push("Instagram");
  if (business.googleReviewUrl) platforms.push("Google");
  if (platforms.length) {
    details.push({
      icon: "✉",
      title: "SOCIALS",
      lines: [platforms.join(" · ")],
    });
  }

  // If no scalar contact fields are set, keep the template's default details.
  return details.length ? details : base.contact.details;
}

function buildFooter(base: BusinessProfile, business: Business) {
  const f = business.content.footer;
  return {
    description: f?.description ?? base.footer.description,
    columns: f?.columns ?? base.footer.columns,
    copyright: f?.copyright ?? base.footer.copyright,
    credit: f?.credit ?? base.footer.credit,
    socials: deriveFooterSocials(base, business),
  };
}

function deriveFooterSocials(
  base: BusinessProfile,
  business: Business,
): SocialLink[] {
  const socials: SocialLink[] = [];
  if (business.facebookUrl) {
    socials.push({
      label: "FB",
      href: business.facebookUrl,
      ariaLabel: "Facebook",
    });
  }
  if (business.instagramUrl) {
    socials.push({
      label: "IG",
      href: business.instagramUrl,
      ariaLabel: "Instagram",
    });
  }
  return socials.length ? socials : base.footer.socials;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Render structured weekly hours into human lines (empty → no HOURS card). */
function formatHours(hours: BusinessHours): string[] {
  if (!Array.isArray(hours) || hours.length === 0) return [];
  return hours
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((d) => {
      const name = DAY_NAMES[d.day] ?? "";
      if (d.closed || !d.open || !d.close) return `${name}: Closed`;
      return `${name}: ${to12h(d.open)} — ${to12h(d.close)}`;
    });
}

function to12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${mStr} ${period}`;
}
