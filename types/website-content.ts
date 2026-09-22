import type {
  FooterNewsletter,
  Hero,
  About,
  SectionHeading,
  Service,
  GalleryItem,
  JournalEntry,
  RetreatSections,
  EventsSections,
  EnquirySection,
  BookingSection,
  Product,
  BookingOption,
  FaqItem,
  FooterColumn,
  NavLink,
  BusinessProfile,
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
  /** The panel under the cards. Only a template that draws one asks for it. */
  approach?: BusinessProfile["services"]["approach"];
}

export interface GalleryContent {
  heading: SectionHeading;
  items: GalleryItem[];
}

/**
 * Dated notes. Stored exactly as rendered — an entry is prose, a date and its
 * photographs, with nothing derived, so unlike the team and testimonial
 * sections there is no narrower stored shape to convert between.
 */
export interface JournalContent {
  heading: SectionHeading;
  items: JournalEntry[];
}

/**
 * The retreat template's own blocks (migration 0039).
 *
 * The ONE section in this catalogue that belongs to a single template, and it
 * earns the exception: these are real, visible parts of a live page — the
 * image break, the experience strip, the brand statement, and the photographs
 * that sit inside otherwise-editable sections — that an owner previously had
 * no way to change at all.
 *
 * Identical to the rendered shape (`RetreatSections`), because nothing here is
 * derived. Only `retreat-lodge` declares it; every other template neither sees
 * it in their navigation nor may write it.
 */
export type RetreatContent = RetreatSections;

/**
 * The events template's own blocks (migration 0041).
 *
 * The SECOND section in this catalogue belonging to a single template, and it
 * earns the exception more plainly than the first: the category cards and the
 * event grid are the part of an event stylist's site that changes most often,
 * and without this they could not add the wedding they styled last month.
 *
 * It also carries the enquiry form's own dropdowns. Those are per-studio
 * choices, not presentation — a stylist who does not take corporate work
 * should not have "Corporate event" in their own form.
 *
 * Identical to the rendered shape (`EventsSections`), because nothing here is
 * derived. Only `events-elegance` declares it; every other template neither
 * sees it in their navigation nor may write it.
 */
export type EventsContent = EventsSections;

/**
 * The two forms, one section each (migration 0044).
 *
 * They were one key inside the events content, edited from a menu that also
 * held the portfolio and the event grid. Identical to the rendered shapes,
 * because nothing here is derived.
 */
export type EnquiryContent = EnquirySection;
export type BookingContent = BookingSection;

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
  /** Small print on the bottom rule. Only a footer that draws one asks for it. */
  legal?: NavLink[];
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
  /**
   * `null` means "no journal", not "use the template default" — same as `faq`.
   * A journal is a running record; falling back to someone else's entries would
   * publish another business's week as this one's.
   */
  journal: JournalContent | null;
  /** Retreat-only blocks. `null` = the template default, like every section. */
  retreat: RetreatContent | null;
  /** Events-only blocks. `null` = the template default, like every section. */
  events: EventsContent | null;
  /** The enquiry form. */
  enquiry: EnquiryContent | null;
  /**
   * The consultation form. `null` means "not customized" as usual — a site
   * that takes no bookings clears the heading instead, which the schema reads
   * as the whole block being absent.
   */
  booking: BookingContent | null;
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
  // Beside the gallery: both are picture-led, and an owner adding photographs
  // is the one most likely to be writing a note at the same time.
  "journal",
  // Where it falls on the page: after the picture-led sections it interleaves
  // with, before the shop. An owner scanning the nav meets it where they meet
  // it on their own site.
  "retreat",
  // Directly after the retreat's, for the same reason: the blocks that are
  // this template's own, sitting where they fall on the page — the portfolio
  // and the event grid come immediately after the hero.
  "events",
  // Beside the contact section they belong to: both are forms a visitor fills
  // in, and an owner looking for "what my booking form asks" looks near
  // Contact rather than near the photographs.
  "enquiry",
  "booking",
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
  journal: "journal_content",
  retreat: "retreat_content",
  events: "events_content",
  enquiry: "enquiry_content",
  booking: "booking_content",
  products: "products_content",
  testimonials: "testimonials_content",
  faq: "faq_content",
  contact: "contact_content",
  footer: "footer_content",
};
