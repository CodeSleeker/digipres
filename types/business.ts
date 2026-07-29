/**
 * Business content contract.
 *
 * This is the tenant-agnostic shape a website template renders. Templates are
 * pure presentation and receive a `BusinessProfile` via props — business data
 * never lives inside a template (see skill: Template Architecture).
 *
 * In development the profile is resolved from `DEV_BUSINESS_SLUG`; in production
 * it will be resolved from the incoming host/domain.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface SocialLink {
  /** Short label rendered in the design (e.g. "IG", "FB", "TK"). */
  label: string;
  href: string;
  /** Accessible name for the link. */
  ariaLabel: string;
}

export interface HeroTitleLine {
  text: string;
  /** Renders as the gold outlined "stroke" treatment. */
  stroke?: boolean;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface CtaButton {
  label: string;
  href: string;
  /** Trailing arrow glyph, as in the mockup ("→"). */
  arrow?: boolean;
}

/**
 * Which source drives the scroll-scrubbed hero.
 *
 * Two interchangeable implementations exist, so a client can supply whichever
 * asset they have:
 *  - "frames" — a WebP frame sequence (templates/.../sections/hero.tsx)
 *  - "video"  — an mp4 sampled to ImageBitmaps (.../sections/hero-video.tsx)
 *
 * Undefined means "frames", so existing tenants are unaffected.
 */
export type HeroMedia = "frames" | "video";

export interface Hero {
  overline: string;
  titleLines: HeroTitleLine[];
  description: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
  stats: HeroStat[];
  /** Defaults to "frames" when absent. */
  heroMedia?: HeroMedia;
  /**
   * Scrub video: an uploaded Supabase Storage URL or one the owner pasted.
   * Absent falls back to the template's own video.
   */
  heroVideoUrl?: string;
}

export interface Service {
  icon: string;
  title: string;
  description: string;
  price: string;
  /** Unit suffix, e.g. "/ session" or "/ package". */
  unit: string;
}

export type CraftLabelPosition = "top" | "left" | "right" | "bottom";

export interface CraftLabel {
  position: CraftLabelPosition;
  title: string;
  description: string;
}

export interface Craft {
  label: string;
  title: string;
  subtitle: string;
  labels: CraftLabel[];
  ctaText: string;
  cta: CtaButton;
  portraitBefore: string;
  portraitAfter: string;
}

export interface About {
  label: string;
  titleLines: string[];
  text: string;
  features: string[];
  cta: CtaButton;
  image: string;
  badgeValue: string;
  badgeLabel: string;
}

export interface Barber {
  name: string;
  role: string;
  bio: string;
  image: string;
  socials: SocialLink[];
}

export interface GalleryItem {
  title: string;
  by: string;
  image: string;
  /** Spans two columns in the desktop grid (mockup `.span-2`). */
  wide?: boolean;
}

export interface Product {
  icon: string;
  name: string;
  description: string;
  price: string;
  /** Optional corner ribbon, e.g. "BEST SELLER", "NEW". */
  tag?: string;
}

export interface Testimonial {
  rating: number;
  text: string;
  author: string;
  meta: string;
  initials: string;
}

export interface ContactDetail {
  icon: string;
  title: string;
  /** Rendered as separate lines (mockup uses <br />). */
  lines: string[];
}

export interface BookingOption {
  label: string;
  value?: string;
}

export interface Contact {
  label: string;
  titleLines: string[];
  intro: string;
  details: ContactDetail[];
  serviceOptions: BookingOption[];
  barberOptions: BookingOption[];
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface SectionHeading {
  label: string;
  title: string;
  subtitle?: string;
}

export interface BusinessProfile {
  slug: string;
  brand: {
    /** Primary logo word, e.g. "RONIE'S". */
    namePrimary: string;
    /** Accent (gold) logo word, e.g. "BARBER". */
    nameAccent: string;
    /** Single-letter logo mark, e.g. "R". */
    initial: string;
  };
  seo: {
    title: string;
    description: string;
  };
  nav: NavLink[];
  navCta: CtaButton;
  hero: Hero;
  marquee: string[];
  services: {
    heading: SectionHeading;
    items: Service[];
  };
  craft: Craft;
  about: About;
  barbers: {
    heading: SectionHeading;
    items: Barber[];
  };
  gallery: {
    heading: SectionHeading;
    items: GalleryItem[];
  };
  products: {
    heading: SectionHeading;
    items: Product[];
  };
  testimonials: {
    heading: SectionHeading;
    items: Testimonial[];
  };
  ctaBanner: {
    label: string;
    titleLines: string[];
    description: string;
    primaryCta: CtaButton;
    callCta: CtaButton;
  };
  contact: Contact;
  footer: {
    description: string;
    columns: FooterColumn[];
    copyright: string;
    credit: string;
    socials: SocialLink[];
  };
  floatingCta: CtaButton;
}
