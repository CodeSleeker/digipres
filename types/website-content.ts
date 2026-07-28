import type {
  Hero,
  About,
  SectionHeading,
  Service,
  GalleryItem,
  BookingOption,
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
}

/** The six editable sections, keyed by section name. `null` = use default. */
export interface WebsiteContent {
  hero: HeroContent | null;
  about: AboutContent | null;
  services: ServicesContent | null;
  gallery: GalleryContent | null;
  contact: ContactContent | null;
  footer: FooterContent | null;
}

export type WebsiteSection = keyof WebsiteContent;

export const WEBSITE_SECTIONS: WebsiteSection[] = [
  "hero",
  "about",
  "services",
  "gallery",
  "contact",
  "footer",
];

/** Maps a section name to its businesses column. */
export const SECTION_COLUMN: Record<WebsiteSection, string> = {
  hero: "hero_content",
  about: "about_content",
  services: "services_content",
  gallery: "gallery_content",
  contact: "contact_content",
  footer: "footer_content",
};
