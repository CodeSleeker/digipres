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

/**
 * A tinted accent. The palette carries three; which one a card wears is a
 * PRESENTATION choice, so templates derive it from position rather than storing
 * it — a stored tone would be silently dropped the first time the CMS saved the
 * section, and nothing would tell you.
 */
export type AccentTone = "mint" | "warm" | "pink";

/** Social proof beneath the hero CTAs: faces, stars, and a sentence. */
export interface HeroProof {
  /** Customer avatars. Decorative — the sentence beside them carries the claim. */
  avatars: string[];
  /** Stars to draw, 1–5. */
  rating: number;
  /** The part of the sentence set in ink, e.g. "4.9 average". */
  highlight: string;
  /** The rest of it, e.g. "from 380 reviews across Google and Facebook." */
  text: string;
}

/** The floating availability card over the hero photograph. */
export interface HeroCard {
  image: string;
  title: string;
  subtitle: string;
  /** 0–100. Fills the track; clamped by the template. */
  progress: number;
  note: string;
}

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
  /**
   * A still photograph beside the copy. Used by templates whose hero is a
   * picture rather than a scroll-scrub; the scrub templates ignore it.
   */
  image?: string;
  /** What the photo shows. Blank keeps it decorative. */
  imageAlt?: string;
  /** Small status pill over the photograph, e.g. "Taking orders this week". */
  badge?: string;
  proof?: HeroProof;
  card?: HeroCard;
}

export interface Service {
  icon: string;
  title: string;
  description: string;
  price: string;
  /** Unit suffix, e.g. "/ session" or "/ package". */
  unit: string;
  /**
   * A photograph of the item. Templates that lead with a glyph (the barber's
   * icon tiles) ignore it; templates that lead with a picture — a menu, a
   * dessert case — need it and fall back to the tinted frame when it's absent.
   */
  image?: string;
  imageAlt?: string;
  /** Small pill above the title, e.g. "Signature". */
  tag?: string;
  /** Line opposite the price, e.g. "Serves 12–14". */
  meta?: string;
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
  /**
   * Alt text for the photo. Optional, and BLANK IS CORRECT by default: the
   * image is an atmospheric shot beside copy that already carries the meaning,
   * so it renders alt="" and screen readers skip it. Filling this in promotes
   * it to a meaningful image — worth doing only when the photo actually shows
   * something the words don't (the shop interior, the owner at work).
   */
  imageAlt?: string;
  badgeValue: string;
  badgeLabel: string;
  /**
   * Further paragraphs after `text`, for templates whose about section is
   * editorial rather than a single block. Empty/absent renders `text` alone.
   */
  paragraphs?: string[];
  /** A figures row beneath the copy. */
  stats?: HeroStat[];
  /** The owner's sign-off under the story. */
  signature?: { name: string; role: string };
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
  /** Optional line beneath the title, e.g. "Happy client — fresh skin fade". */
  caption?: string;
  image: string;
  /**
   * What the photo SHOWS, for readers who can't see it.
   *
   * Distinct from `title` on purpose. The title is a label for the work and is
   * already visible in the figcaption, so using it as alt made a screen reader
   * announce the same string twice and describe nothing. Falls back to `title`
   * when blank — imperfect, but better than an unlabelled photo.
   */
  alt?: string;
  /** Spans two columns in the desktop grid (mockup `.span-2`). */
  wide?: boolean;
  /**
   * The photograph's intrinsic pixel size, measured when it was added.
   *
   * Only a masonry needs it, and it needs it badly: uneven column heights are
   * the entire form, and without the real proportions a template has to invent
   * them and crop every picture to fit. Optional because it is measured, not
   * typed — an image that fails to load leaves both undefined, and a layout
   * that depends on them must degrade rather than break.
   *
   * Always set as a pair. One without the other describes nothing.
   */
  width?: number;
  height?: number;
}

/**
 * A photograph inside a journal entry.
 *
 * `caption` and `alt` are different jobs and both are worth having: the caption
 * is printed under the picture for everyone ("The deck, first light"), while
 * the alt describes what the picture SHOWS to a reader who can't see it. Using
 * one for the other either leaves the photo undescribed or makes a screen
 * reader announce the same words twice.
 */
export interface JournalImage {
  src: string;
  alt?: string;
  caption?: string;
}

/**
 * One dated note.
 *
 * The only content on the site that is about NOW rather than about what the
 * business permanently is — the season, the last guests, a change to the house.
 *
 * `date` is an ISO calendar date (YYYY-MM-DD), never a timestamp: an entry is
 * written about a day, not a moment, and storing an instant would drag a
 * timezone into a field whose whole meaning is "this happened on the 3rd".
 * Templates sort on it, so an owner never has to reorder rows by hand.
 */
export interface JournalEntry {
  date: string;
  title: string;
  text: string;
  images: JournalImage[];
}

export interface Product {
  icon: string;
  name: string;
  description: string;
  price: string;
  /** Optional corner ribbon, e.g. "BEST SELLER", "NEW". */
  tag?: string;
  /** See `Service.image` — same reason, same fallback. */
  image?: string;
  imageAlt?: string;
  /** Short qualifier under the name, e.g. "Box of 6". */
  meta?: string;
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

/**
 * The mailing-list sign-up block in the footer.
 *
 * Editable copy, but the block only RENDERS for a tenant whose sending domain
 * has been verified — a form that collects addresses nobody can mail is worse
 * than no form. The gate lives at the render site, not here.
 *
 * `consent` is the sentence shown beside the field and stored verbatim with
 * whoever signs up, so the record says what they were actually shown.
 */
export interface FooterNewsletter {
  title: string;
  text: string;
  placeholder: string;
  buttonLabel: string;
  consent: string;
}

/**
 * One question and its answer.
 *
 * Plain strings, not rich text: the same values are rendered on the page AND
 * placed inside FAQPage JSON-LD, and structured data must carry the answer as
 * text. Keeping one representation means the two can never disagree — which
 * Google's structured-data policy treats as a violation, not a nitpick.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export interface SectionHeading {
  label: string;
  title: string;
  subtitle?: string;
  /**
   * A link set opposite the heading ("See the full menu →"). Presentation-only;
   * templates that centre their headings ignore it.
   */
  link?: CtaButton;
}

/**
 * ─── Patisserie-only sections ────────────────────────────────────────────────
 *
 * Content that exists on ONE template and has no counterpart anywhere else.
 *
 * Held in their own namespace rather than folded into the shared sections for a
 * concrete reason: `buildBusinessProfile` replaces an edited section WHOLESALE
 * with what the CMS stored, so any field the CMS form doesn't render is dropped
 * the first time an owner saves that section. Parking these here keeps them out
 * of that path entirely — they come from the template default until the CMS
 * grows forms that know about them.
 */
export interface CakeStep {
  title: string;
  description: string;
}

export interface CustomCakes {
  label: string;
  titleLines: string[];
  intro: string;
  steps: CakeStep[];
  /** Collage: [0] is the large frame, [1] the inset. */
  images: { src: string; alt: string }[];
  /** Corner pill on the collage, e.g. "Booked 2–4 weeks ahead". */
  tag: string;
  /** Choices offered by the enquiry starter. */
  occasionOptions: BookingOption[];
  submitLabel: string;
  note: string;
}

/**
 * ─── Retreat-only sections ───────────────────────────────────────────────────
 *
 * Same arrangement as `PatisserieSections`, and for the same reason — see the
 * note above it. These are the parts of the retreat design that have no
 * counterpart on any other template: an atmospheric break, a strip about how a
 * stay feels, a brand statement. They come from the template default until the
 * CMS grows forms that know about them, and a section save can never reach
 * them.
 */
export interface RetreatFeature {
  title: string;
  description: string;
}

export interface RetreatSections {
  /**
   * Where the property is, as printed under the hero and in the footer.
   *
   * Template copy today. It SHOULD derive from the tenant's address columns,
   * which is where the same fact already lives — but the profile carries the
   * address only as pre-formatted `contact.details` lines, and recognising the
   * location card by its title is the kind of coupling that breaks silently.
   * Deriving it properly means giving the profile the address itself.
   */
  place: { locality: string; country: string };
  /**
   * The line under the story photograph ("The house, Dahilayan").
   *
   * A caption, not alt text: it names the picture for everyone, where
   * `about.imageAlt` describes it for a reader who can't see it. The two say
   * different things and both are rendered.
   */
  introCaption: string;
  /** The wide photograph under the stay heading. */
  stayImage: { src: string; alt: string };
  /** The full-bleed parallax break between the stay and the gallery. */
  imageBreak: {
    titleLines: string[];
    note: string;
    image: string;
    imageAlt: string;
  };
  /** The dark strip: three numbered notes on what a stay is like. */
  experience: {
    label: string;
    titleLines: string[];
    items: RetreatFeature[];
  };
  /** The photograph, map panel and directions link beside the location copy. */
  location: {
    image: string;
    imageAlt: string;
    /** Caption on the map panel, which stands in until an embed is added. */
    mapLabel: string;
    /** Rendered only for a real link — see the note in the Location section. */
    mapCta: CtaButton;
  };
  /** The brand statement between the location and the booking CTA. */
  quote: { text: string; attribution: string };
  /**
   * The photograph behind the booking CTA. A src alone, with no alt: it is
   * dimmed to 40% under a near-opaque gradient and carries nothing the heading
   * beside it doesn't already say, so it is decorative and stays that way.
   */
  bookingImage: string;
}

export interface PatisserieSections {
  customCakes: CustomCakes;
  /** The "still deciding?" panel beside the questions. */
  faqAside: { title: string; text: string; cta: CtaButton };
  /** Lead-time line under the best-sellers rail. */
  railNote: string;
  /** The footer's fourth column. */
  footerNote: { title: string; text: string; cta: CtaButton };
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
    /**
     * The owner's uploaded logo image. When set the template shows it INSTEAD
     * of the initial mark; the wordmark words stay as the accessible name, so
     * the header still reads correctly if the image fails to load.
     */
    logoUrl: string | null;
    /**
     * Optional image of the NAME. When set the template shows it instead of
     * the wordmark words — and gives it a real `alt`, because the name is no
     * longer text in the DOM. A tenant whose logo is one lockup puts it here
     * and leaves `logoUrl` null.
     */
    wordmarkUrl: string | null;
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
  /**
   * The barber template's process strip. Optional because it is the one section
   * with no analogue on any other industry — a patisserie has no "craft" panel,
   * and inventing empty content for it would be a lie the CMS could later show.
   */
  craft?: Craft;
  about: About;
  barbers: {
    heading: SectionHeading;
    items: Barber[];
  };
  gallery: {
    heading: SectionHeading;
    items: GalleryItem[];
  };
  /**
   * Dated notes from the owner. Optional on the profile, because it arrived
   * after two templates already existed and neither renders it — the same
   * reason `craft` is optional. A template that doesn't declare the section
   * never receives it, and one that does renders nothing while `items` is
   * empty.
   */
  journal?: {
    heading: SectionHeading;
    items: JournalEntry[];
  };
  products: {
    heading: SectionHeading;
    items: Product[];
  };
  testimonials: {
    heading: SectionHeading;
    items: Testimonial[];
  };
  /**
   * Empty `items` is the normal state, not a defect: the template default ships
   * with none, so a tenant who hasn't written their own renders no section.
   */
  faq: {
    heading: SectionHeading;
    items: FaqItem[];
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
    /** Absent, or the tenant hasn't been cleared to send — either way, no box. */
    newsletter?: FooterNewsletter;
  };
  floatingCta: CtaButton;
  /** Present only on the patisserie template. See `PatisserieSections`. */
  patisserie?: PatisserieSections;
  /** Present only on the retreat template. See `RetreatSections`. */
  retreat?: RetreatSections;
}
