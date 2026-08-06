import type {
  FooterNewsletter,
  Hero,
  About,
  SectionHeading,
  Service,
  GalleryItem,
  Product,
  BookingOption,
  FaqItem,
  FooterColumn,
} from "./business";

/**
 * Editable website content, stored as per-section JSONB on the businesses row.
 *
 * Shapes reuse the template's own section types (types/business.ts) so the
 * public UI contract never changes. Contact/Footer store ONLY the parts that
 * aren't already scalar columns — phone/address/hours/socials are merged in at
 * render time (see lib/website/build-profile.ts).
 */

export type HeroContent = Hero;
export type AboutContent = About;

export interface ServicesContent {
  heading: SectionHeading;
  items: Service[];
}

export interface GalleryContent {
  heading: SectionHeading;
  items: GalleryItem[];
}

/**
 * One team member as STORED. Deliberately not `Barber`: the rendered type
 * carries a `socials: SocialLink[]` array whose `label`/`ariaLabel` are
 * presentation details no owner should have to type. Here we keep the two
 * profile URLs and derive the rest at render time (lib/website/build-profile).
 */
export interface BarberEntry {
  name: string;
  role: string;
  bio: string;
  image: string;
  instagramUrl?: string;
  facebookUrl?: string;
}

export interface BarbersContent {
  heading: SectionHeading;
  items: BarberEntry[];
}

export interface ProductsContent {
  heading: SectionHeading;
  items: Product[];
}

/**
 * One testimonial as STORED. Like `BarberEntry`, deliberately narrower than the
 * rendered `Testimonial`: the avatar `initials` are a presentation detail
 * derived from the author's name, not something an owner should have to keep in
 * sync with it.
 */
export interface TestimonialEntry {
  rating: number;
  text: string;
  author: string;
  meta: string;
}

export interface TestimonialsContent {
  heading: SectionHeading;
  items: TestimonialEntry[];
}

/**
 * Question/answer pairs. Unlike every other section, an un-customized tenant
 * has NOTHING here to fall back to — see the note on WebsiteContent.faq.
 */
export interface FaqContent {
  heading: SectionHeading;
  items: FaqItem[];
}

export interface ContactContent {
  label: string;
  titleLines: string[];
  intro: string;
  serviceOptions: BookingOption[];
  barberOptions: BookingOption[];
}

export interface FooterContent {
  description: string;
  columns: FooterColumn[];
  copyright: string;
  credit: string;
  /** Sign-up copy. Stored, but only rendered for a verified sender. */
  newsletter?: FooterNewsletter;
}

/**
 * Every editable section the platform knows about, keyed by section name.
 * `null` = use the template default.
 *
 * This is the FULL catalogue, not what any one tenant can edit: a template
 * declares the subset it actually renders (templates/registry.ts → `sections`),
 * and the CMS navigation and routes are derived from that.
 */
export interface WebsiteContent {
  hero: HeroContent | null;
  about: AboutContent | null;
  services: ServicesContent | null;
  barbers: BarbersContent | null;
  gallery: GalleryContent | null;
  products: ProductsContent | null;
  testimonials: TestimonialsContent | null;
  /**
   * `null` here means "no FAQ", not "use the template default" — the barber
   * default carries zero items on purpose, so the two collapse to the same
   * thing: nothing rendered and no FAQPage schema emitted.
   */
  faq: FaqContent | null;
  contact: ContactContent | null;
  footer: FooterContent | null;
}

export type WebsiteSection = keyof WebsiteContent;

/** Catalogue order — templates present their own sections in this order. */
export const WEBSITE_SECTIONS: WebsiteSection[] = [
  "hero",
  "about",
  "services",
  "barbers",
  "gallery",
  "products",
  "testimonials",
  // Between testimonials and contact: objections get answered immediately
  // before the booking CTA, which is where a reader expects them.
  "faq",
  "contact",
  "footer",
];

/** Maps a section name to its businesses column. */
export const SECTION_COLUMN: Record<WebsiteSection, string> = {
  hero: "hero_content",
  about: "about_content",
  services: "services_content",
  barbers: "barbers_content",
  gallery: "gallery_content",
  products: "products_content",
  testimonials: "testimonials_content",
  faq: "faq_content",
  contact: "contact_content",
  footer: "footer_content",
};
