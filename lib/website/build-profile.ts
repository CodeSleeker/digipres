import type {
  Barber,
  Testimonial,
  BusinessProfile,
  Contact,
  ContactDetail,
  SocialLink,
} from "@/types/business";
import type {
  Business,
  BusinessBrand,
  BusinessHours,
} from "@/types/business-entity";
import type { BarberEntry, TestimonialEntry } from "@/types/website-content";
import { formatAddress } from "@/lib/businesses/address";

/**
 * Merge a database Business over the template's default profile to produce the
 * BusinessProfile the public template renders.
 *
 * Rules:
 *  - Editable sections come from the stored content when present, else the
 *    default (so an un-customized site still renders). Which sections a tenant
 *    may edit is declared by their template (templates/registry.ts); a section
 *    the template doesn't render simply never gets written.
 *  - Contact details and footer socials are DERIVED from the scalar business
 *    columns (phone/address/hours/socials) rather than duplicated in JSON.
 *  - Non-editable sections (header/nav/marquee/craft/testimonials/ctaBanner)
 *    are left as the default.
 */
export function buildBusinessProfile(
  base: BusinessProfile,
  business: Business,
): BusinessProfile {
  const { content } = business;
  const faq = content.faq ?? base.faq;
  /*
   * The journal falls back to the template default, like every section except
   * the FAQ — so a tenant who has not written anything yet still renders the
   * section, which is what makes the seeded entries worth shipping.
   *
   * KNOWN TRADE-OFF, decided deliberately. The default's entries are dated and
   * written in the first person, so an owner who never opens the CMS publishes
   * them as their own. The mitigation is in the content, not here: the seeded
   * entries are atmosphere — the weather, the light — and carry no claim
   * specific enough to be false about somebody else's property. Anything that
   * could be wrong must not go in a default (see lib/businesses/gloria.ts).
   *
   * Clearing the list is still how an owner removes the section: an explicit
   * `{ items: [] }` is stored content, not absence, so it does not fall back.
   */
  const journal = content.journal ?? base.journal;

  return {
    ...base,
    // Links to sections that have nothing in them are dropped. `nav` is a
    // static array on the template default, so an unconditional entry would
    // give every tenant without an FAQ (or a journal) an anchor that scrolls
    // nowhere.
    nav: base.nav.filter(
      (item) =>
        (item.href !== "#faq" || faq.items.length > 0) &&
        (item.href !== "#journal" || (journal?.items.length ?? 0) > 0),
    ),
    // The tenant's OWN slug, not the template default's.
    //
    // `base` is a real profile (lib/businesses/ronies.ts) doubling as the
    // barber/luxury default, so without this every tenant on that template
    // carries slug "ronies". It went unnoticed because that WAS the first
    // client's slug — the coincidence held until they were renamed.
    //
    // It is not cosmetic: the booking form posts this slug as the tenant hint
    // for requests whose host doesn't identify a tenant (the apex path
    // /s/<slug>), so a stale value sends the booking to a business that may no
    // longer exist.
    slug: business.slug,
    brand: resolveBrand(base, business),
    seo: {
      title: business.name || base.seo.title,
      description: business.description ?? base.seo.description,
    },
    hero: content.hero ?? base.hero,
    about: content.about ?? base.about,
    services: content.services ?? base.services,
    barbers: buildBarbers(base, business),
    gallery: content.gallery ?? base.gallery,
    journal,
    products: content.products ?? base.products,
    testimonials: buildTestimonials(base, business),
    faq,
    contact: buildContact(base, business),
    footer: buildFooter(base, business),
  };
}

/**
 * The tenant's identity in the header and footer: the wordmark plus, when the
 * owner has uploaded one, the logo image that replaces the initial mark.
 *
 * The image is kept on the same object as the words rather than passed
 * separately, because a template rendering one always needs the other — the
 * words are the image's accessible name and its fallback.
 */
export function resolveBrand(
  base: BusinessProfile,
  business: Business,
): BusinessProfile["brand"] {
  return {
    ...resolveWordmark(base, business),
    // `?? null` so the profile matches its own type at RUNTIME, not just to
    // TypeScript. The repository always produces null for an unset column, but
    // this is the boundary that builds the rendering contract, and a field the
    // template branches on should never arrive as undefined from anywhere.
    logoUrl: business.logoUrl ?? null,
    wordmarkUrl: business.wordmarkUrl ?? null,
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
export function resolveWordmark(
  base: BusinessProfile,
  business: Business,
): BusinessBrand {
  const override = business.brand;
  if (override?.namePrimary) {
    return {
      namePrimary: override.namePrimary,
      nameAccent: override.nameAccent ?? "",
      initial: override.initial || override.namePrimary[0]!.toUpperCase(),
    };
  }
  return deriveBrand(business.name) ?? stripLogo(base.brand);
}

/** Split a business name into the two-tone wordmark, or null if unusable. */
export function deriveBrand(name: string): BusinessBrand | null {
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

/** The template default carries a (null) logo slot; the words alone are wanted. */
function stripLogo(brand: BusinessProfile["brand"]): BusinessBrand {
  return {
    namePrimary: brand.namePrimary,
    nameAccent: brand.nameAccent,
    initial: brand.initial,
  };
}

/**
 * The team section. Stored entries carry bare profile URLs; the rendered
 * `Barber` needs `SocialLink`s, so the label and accessible name are derived
 * here — an owner should never be able to publish an `aria-label` that lies
 * about where a link goes.
 */
function buildBarbers(
  base: BusinessProfile,
  business: Business,
): BusinessProfile["barbers"] {
  const stored = business.content.barbers;
  if (!stored) return base.barbers;
  return {
    heading: stored.heading,
    items: stored.items.map(toBarber),
  };
}

export function toBarber(entry: BarberEntry): Barber {
  const socials: SocialLink[] = [];
  if (entry.instagramUrl) {
    socials.push({
      label: "IG",
      href: entry.instagramUrl,
      ariaLabel: `${entry.name} on Instagram`,
    });
  }
  if (entry.facebookUrl) {
    socials.push({
      label: "FB",
      href: entry.facebookUrl,
      ariaLabel: `${entry.name} on Facebook`,
    });
  }
  return {
    name: entry.name,
    role: entry.role,
    bio: entry.bio,
    image: entry.image,
    socials,
  };
}

/**
 * The inverse of `toBarber`, used to prefill the CMS form from a template
 * default. Placeholder hrefs in template data (`"#"`) are dropped rather than
 * shown, since they aren't valid links an owner could save.
 */
export function toBarberEntry(barber: Barber): BarberEntry {
  const href = (label: string) =>
    barber.socials.find(
      (s) => s.label.toUpperCase() === label && s.href.startsWith("https://"),
    )?.href;

  return {
    name: barber.name,
    role: barber.role,
    bio: barber.bio,
    image: barber.image,
    instagramUrl: href("IG"),
    facebookUrl: href("FB"),
  };
}

function buildTestimonials(
  base: BusinessProfile,
  business: Business,
): BusinessProfile["testimonials"] {
  const stored = business.content.testimonials;
  if (!stored) return base.testimonials;
  return {
    heading: stored.heading,
    items: stored.items.map(toTestimonial),
  };
}

export function toTestimonial(entry: TestimonialEntry): Testimonial {
  return {
    rating: entry.rating,
    text: entry.text,
    author: entry.author,
    meta: entry.meta,
    initials: deriveInitials(entry.author),
  };
}

/**
 * Avatar initials for a testimonial — first letter of the first and last words
 * ("Juan Reyes" → "JR"). Derived rather than stored so the monogram can't end
 * up disagreeing with the name printed next to it.
 *
 * Uses Array.from so a name starting with an astral character (an emoji, or
 * scripts outside the BMP) yields a whole character rather than half a
 * surrogate pair, which would render as a replacement glyph.
 */
export function deriveInitials(author: string): string {
  const words = author.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const first = Array.from(words[0]!)[0] ?? "";
  if (words.length === 1) return first.toUpperCase();

  const last = Array.from(words[words.length - 1]!)[0] ?? "";
  return (first + last).toUpperCase();
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

  // Composed from the split components (migration 0027) so the card and the
  // JSON-LD can't disagree about where the business is.
  const address = formatAddress(business);
  if (address) {
    details.push({
      icon: "📍",
      title: "LOCATION",
      lines: [business.name, address].filter(Boolean) as string[],
    });
  }

  const hourLines = formatHours(business.hours);
  if (hourLines.length) {
    details.push({ icon: "🕐", title: "HOURS", lines: hourLines });
  }

  if (business.phone) {
    details.push({ icon: "📱", title: "PHONE", lines: [business.phone] });
  }

  const platforms = SOCIAL_PLATFORMS.filter((p) => p.url(business)).map(
    (p) => p.name,
  );
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
    socials: deriveFooterSocials(business),
    /*
     * The sign-up block, and the gate on it.
     *
     * Copy comes from the tenant or the template default, but it is dropped
     * entirely unless the platform has verified their sending domain. That is
     * what stops a site collecting addresses nobody is able to mail — the box
     * would work, the confirmation would never arrive, and the visitor would be
     * left believing they had subscribed.
     */
    newsletter: business.newsletterVerified
      ? (f?.newsletter ?? base.footer.newsletter)
      : undefined,
  };
}

/**
 * Footer social icons, one per link the owner actually set.
 *
 * There is deliberately NO fallback to the template's own socials: those are
 * demo data pointing at "#", so falling back published three dead links —
 * including a TikTok icon — on the site of every business that hadn't filled
 * them in. An empty row is honest; dead links are not.
 */
function deriveFooterSocials(business: Business): SocialLink[] {
  return SOCIAL_PLATFORMS.flatMap(({ label, name, url }) => {
    const href = url(business);
    return href ? [{ label, href, ariaLabel: name }] : [];
  });
}

/**
 * The social platforms the design has a slot for. `label` is the two-letter
 * monogram the template renders; `name` is what assistive tech announces.
 */
const SOCIAL_PLATFORMS: {
  label: string;
  name: string;
  url: (b: Business) => string | null;
}[] = [
  { label: "FB", name: "Facebook", url: (b) => b.facebookUrl },
  { label: "IG", name: "Instagram", url: (b) => b.instagramUrl },
  { label: "TK", name: "TikTok", url: (b) => b.tiktokUrl },
];

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
