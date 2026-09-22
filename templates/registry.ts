import type { ComponentType } from "react";
import type { BusinessProfile } from "@/types/business";
import { WEBSITE_SECTIONS, type WebsiteSection } from "@/types/website-content";

/**
 * Available website templates and themes.
 *
 * The registry lives in code because the React components do. A business stores
 * only the CODES (businesses.template_code / theme_code); this is the list those
 * codes are validated against, the source for pickers in the UI, and — via
 * `loadTemplate` — what the public render path resolves.
 *
 * TO ADD A TEMPLATE:
 *   1. templates/<industry>/html/<name>.html   (approved visual source)
 *   2. templates/<industry>/<name>/            (React conversion)
 *   3. a default profile (the merge base for un-customized tenants)
 *   4. an entry in TEMPLATES + a case in loadTemplate()
 *
 * Every template currently receives the same `BusinessProfile`. When industries
 * diverge enough to need their own section shapes, add a `contentSchema` to
 * TemplateDefinition and drive the CMS from it — that's the intended seam.
 *
 * `sections` is the first step down that road: it declares which editable
 * sections a template actually renders, so the CMS only ever offers a tenant
 * the sections their own site has (a restaurant template has no barbers).
 */
export interface ThemeOption {
  code: string;
  name: string;
}

/**
 * The optional per-section fields a template actually renders.
 *
 * Section shapes are shared, but templates use different parts of them: the
 * barber's service cards lead with a glyph, the patisserie's lead with a
 * photograph. Both are `Service`, and both are legitimate.
 *
 * The CMS derives its inputs from this, and it is a CORRECTNESS mechanism, not
 * a tidiness one. `buildBusinessProfile` replaces an edited section wholesale
 * with what was stored, so a field the form doesn't render is dropped on save —
 * an owner would blank half their page by opening a form and pressing save. So
 * the rule is: every optional field a template READS must be declared here, and
 * the form renders exactly the declared set (passing the rest through
 * untouched).
 *
 * Everything defaults to false, so a new template opts in to what it needs.
 */
export interface TemplateFields {
  /** Scroll-scrubbed hero driven by a frame sequence or a video. */
  heroScrub?: boolean;
  /** A still hero photograph, its alt text and the small status pill on it. */
  heroPhoto?: boolean;
  /**
   * The social-proof strip under the hero copy: faces, stars and a sentence.
   *
   * Split out of `heroPhoto`, which used to mean the photograph AND the proof
   * strip AND the slot card — nine inputs for a hero that might draw three.
   * An owner on the events template was being asked for customer avatars and
   * a star rating that appear nowhere on their page.
   */
  heroProof?: boolean;
  /**
   * The floating card over the hero photograph: title, subtitle, picture, a
   * progress bar and a note.
   *
   * Also split out of `heroPhoto`. A template that draws a simple badge rather
   * than an availability card declares this and leaves the rest alone.
   */
  heroCard?: boolean;
  /**
   * The availability half of that card: a subtitle, a fill bar and a note.
   *
   * Only a template that draws a DIARY card has anywhere to put them. A hero
   * whose card is a two-line badge does not, and a progress bar offered to an
   * event stylist is an input they fill in once and never find again.
   */
  heroCardAvailability?: boolean;
  /**
   * A full-bleed hero photograph the copy sits ON, rather than beside.
   *
   * The picture and its alt text only — no pill, proof strip or slot card,
   * which is what separates this from `heroPhoto`. Declaring that one instead
   * would offer an owner three blocks their hero has nowhere to put.
   */
  heroBackdrop?: boolean;
  /** The figures row in the hero. */
  heroStats?: boolean;
  /** A glyph on each service/product card. */
  itemIcons?: boolean;
  /** A photograph, badge and qualifier line on each service/product card. */
  itemPhotos?: boolean;
  /**
   * A price and unit on each service/product card.
   *
   * Unlike the flags above this one also RELAXES validation when absent: price
   * is otherwise a required field. See `SectionRules` in
   * schemas/website-content.ts for why.
   */
  itemPricing?: boolean;
  /** The checklist under the story. */
  aboutFeatures?: boolean;
  /** The button under the story. Also relaxes validation — see `itemPricing`. */
  aboutCta?: boolean;
  /** The figure badge on the story photograph. Also relaxes validation. */
  aboutBadge?: boolean;
  /** Extra paragraphs, a figures row and a sign-off under the story. */
  aboutEditorial?: boolean;
  /**
   * Extra paragraphs under the story, and nothing else.
   *
   * The narrow half of `aboutEditorial`, for a template whose story runs to a
   * second paragraph but carries no figures row and no sign-off. Declaring the
   * broad flag instead would offer an owner a Figures table and a Signature
   * their page has nowhere to print — the same reason `heroBackdrop` exists
   * beside `heroPhoto`.
   */
  aboutParagraphs?: boolean;
  /**
   * The contact section's own eyebrow, title and intro.
   *
   * A template whose contact area is a CTA banner rather than a headed section
   * renders none of them — the events template uses only `contact.label`, as
   * the heading of its footer's contact column. Offering the other two there
   * gives an owner a headline and a paragraph that appear nowhere, and the
   * first thing they do is type into them.
   */
  contactHeading?: boolean;
  /**
   * The mailing-list sign-up block in the footer.
   *
   * Separate from whether the tenant MAY send: `newsletterVerified` decides
   * that, and both have to be true. Only the patisserie's footer draws the
   * box; the other three have no column to put it in, so their owners were
   * being offered copy for something their site would never render — which is
   * the very thing the verification gate exists to prevent.
   */
  footerNewsletter?: boolean;
  /**
   * The image-and-figures panel under the service cards.
   *
   * Lives on the shared services section rather than a template namespace,
   * because an owner editing "how we work" is editing the same band of their
   * page as the cards above it — splitting them put half a section in one CMS
   * menu and half in another.
   */
  servicesApproach?: boolean;
  /**
   * The small print beside the copyright on the footer's bottom rule.
   *
   * Only a footer that draws a bottom rule has anywhere to put it. It used to
   * be a footer COLUMN titled "Legal" that the section lifted out of the grid
   * by matching the title — rename it and the links moved, with nothing
   * saying so.
   */
  footerLegalLinks?: boolean;
  /** A link set opposite a section heading ("See the full menu →"). */
  headingLinks?: boolean;
  /** A credit line on each gallery photograph ("By Ronie"). */
  galleryCredit?: boolean;
  /**
   * The enquiry form's "what is this about?" dropdown.
   *
   * A template with no booking form at all renders neither this nor
   * `staffOptions`, and must be offered neither — options an owner types into a
   * form their site doesn't have are collected and never shown.
   */
  bookingOptions?: boolean;
  /**
   * The enquiry form's "who with?" dropdown — the per-person routing a shop
   * with named staff needs and a single property does not.
   */
  staffOptions?: boolean;
}

export interface TemplateOption {
  code: string;
  name: string;
  /** Maps to the business_category enum where one exists. */
  industry: string;
  description: string;
  themes: ThemeOption[];
  /**
   * The editable sections this template renders, in the order the CMS should
   * present them. Anything omitted is hidden from the navigation AND refused by
   * the section route — a tenant can't edit content their site never shows.
   */
  sections: WebsiteSection[];
  /** Which optional fields of those sections the template renders. */
  fields: TemplateFields;
}

export const TEMPLATES: TemplateOption[] = [
  {
    code: "barber-luxury",
    name: "Barber — Luxury",
    industry: "barber",
    description:
      "Dark, gold-accented single page: hero, craft, services, gallery, team, contact.",
    themes: [{ code: "default", name: "Gold on Black" }],
    sections: [
      "hero",
      "about",
      "services",
      "barbers",
      "gallery",
      "products",
      "testimonials",
      "faq",
      // Beside Contact, which is what they are: two forms a visitor fills in.
      "enquiry",
      "booking",
      "contact",
      "footer",
    ],
    fields: {
      heroScrub: true,
      heroStats: true,
      itemIcons: true,
      itemPricing: true,
      aboutFeatures: true,
      aboutCta: true,
      aboutBadge: true,
      bookingOptions: true,
      staffOptions: true,
      galleryCredit: true,
      contactHeading: true,
    },
  },
  {
    code: "patisserie-boutique",
    name: "Patisserie — Boutique",
    // The `business_category` value, which is not the folder name: the approved
    // source lives under templates/patisserie/ because that is what the design
    // is called, while the category is the broader trade a tenant picks during
    // onboarding.
    industry: "bakery",
    description:
      "Light, editorial single page: hero, menu, best sellers, custom cakes, gallery, story, contact.",
    themes: [{ code: "default", name: "Paper & Mint" }],
    /** No team section — a patisserie has no barbers. */
    sections: [
      "hero",
      "about",
      "services",
      "products",
      "gallery",
      "testimonials",
      "faq",
      "contact",
      "footer",
    ],
    fields: {
      heroPhoto: true,
      // Both were part of `heroPhoto` before it was split; this template is
      // the one that actually draws them, so its form is unchanged.
      heroProof: true,
      heroCard: true,
      heroCardAvailability: true,
      itemPhotos: true,
      itemPricing: true,
      aboutEditorial: true,
      aboutBadge: true,
      /*
       * Declared, but NOT rendered by this template's story section.
       *
       * It records today's behaviour rather than endorsing it: the form has
       * always shown these inputs and the default profile has always carried a
       * button nothing draws. Dropping the flag is the fix — it would hide the
       * inputs and let the stored value go blank — but that changes an approved
       * template's content, so it belongs in its own change, not this one.
       */
      aboutCta: true,
      headingLinks: true,
      /* An enquiry form, but no staff to route to — the kitchen is one person. */
      bookingOptions: true,
      contactHeading: true,
      /* The one template with a fourth footer column to put the box in. */
      footerNewsletter: true,
    },
  },
  {
    code: "retreat-lodge",
    name: "Retreat — Lodge",
    industry: "lodging",
    description:
      "Ivory and forest single page for a private stay: scrubbed hero, the stay, gallery, experience, location, booking.",
    themes: [{ code: "default", name: "Ivory & Forest" }],
    /**
     * No team, products, testimonials or FAQ. A private house has no staff
     * page and no shop; its one quotation is a brand statement rather than a
     * customer's, so it is template copy (`RetreatSections.quote`) instead of a
     * testimonial an owner would be invited to collect more of.
     */
    /*
     * FIRST, so it sits directly under Branding in the navigation.
     *
     * `sections` is the order the CMS presents them in, not the order they
     * appear on the page — and these two belong together: Branding and this
     * are the entries that aren't ordinary page sections. Everything after
     * runs top-to-bottom down the site.
     */
    sections: [
      // This template's own blocks: the wide photographs, the full-width
      // break, the experience strip and the quotation. Rendered from the
      // default until an owner edits them, and previously not editable at all.
      "retreat",
      "hero",
      "about",
      "services",
      "gallery",
      "journal",
      "faq",
      "contact",
      "footer",
    ],
    fields: {
      heroBackdrop: true,
      /*
       * The enquiry form's "what kind of stay" dropdown. Declared, and
       * `staffOptions` deliberately not: a whole-property let has no one to
       * route to.
       */
      bookingOptions: true,
      /*
       * The story's second paragraph, which this template renders and could
       * not previously be edited — the section read a field the CMS never
       * offered. `aboutParagraphs` and not `aboutEditorial`: there is no
       * figures row and no sign-off in this design.
       */
      aboutParagraphs: true,
      contactHeading: true,
    },
  },
  {
    code: "events-elegance",
    name: "Events — Elegance",
    /*
     * The category added in migration 0042. It does NOT buy better structured
     * data — schema.org has no event-planning type, so this still publishes as
     * LocalBusiness (see the note in lib/seo/json-ld.ts). It buys a truthful
     * word in the platform list, the owner's settings and the onboarding
     * picker, where this template used to register as "Other".
     */
    industry: "events",
    description:
      "Cream and gold single page for an event stylist: hero, portfolio, filterable event grid, services, story, enquiry.",
    themes: [{ code: "default", name: "Cream & Gold" }],
    /*
     * No team, products, gallery, journal or FAQ. The portfolio strip and the
     * event grid are this template's own content (`EventsSections`), drawn
     * from the template default until the CMS grows forms that know about
     * them — the same route PatisserieSections and RetreatSections took.
     */
    sections: [
      /*
       * FIRST, beside Branding — the same placement the retreat's own blocks
       * get, and for the same reason: this is not an ordinary page section.
       * It carries the portfolio cards, the event grid, the approach panel
       * and the enquiry form's dropdowns (migration 0041).
       */
      "events",
      "hero",
      "services",
      "about",
      "testimonials",
      "faq",
      "contact",
      "footer",
    ],
    fields: {
      /*
       * The hero photograph, its status pill and the card beside it. The
       * proof strip this flag also offers is NOT drawn by this hero — but
       * declaring the narrower flag is the dangerous direction: a field the
       * form omits is dropped on save, while a field it offers and the page
       * ignores merely goes unused.
       */
      heroPhoto: true,
      /*
       * ONLY `heroPhoto`. Not `heroProof` — no faces-and-stars strip — and no
       * longer `heroCard` either: the glass badge used to borrow a floating
       * availability card's picture and title, which is what had an event
       * stylist being asked for a diary progress bar. Those two parts now live
       * in this template's own content (`EventsSections.hero`), where the form
       * can label them for what they are.
       */
      /* A glyph on each service card, and no price — an event is quoted. */
      itemIcons: true,
      /* The "How it works" panel under the cards, and the small print on the
         footer's bottom rule. Both used to live in this template's own CMS
         menu; they belong with the sections they are part of. */
      servicesApproach: true,
      footerLegalLinks: true,
      /* The story's second paragraph, figures row and sign-off. */
      aboutEditorial: true,
      aboutBadge: true,
      /*
       * Deliberately absent: `bookingOptions` and `staffOptions`. The enquiry
       * form's dropdowns come from `events.inquiry`, so offering an owner the
       * shared booking options would collect answers the form never shows.
       */
    },
  },
];

export const DEFAULT_TEMPLATE_CODE = "barber-luxury";
export const DEFAULT_THEME_CODE = "default";

export function findTemplate(code: string): TemplateOption | null {
  return TEMPLATES.find((t) => t.code === code) ?? null;
}

/**
 * The editable sections available to a business on this template.
 *
 * An unknown/missing code resolves to the default template — matching
 * `loadTemplate`, so the CMS always offers exactly the sections of the site
 * that is actually being rendered. Falls back to the full catalogue only if the
 * default template itself is missing, which would be a packaging error.
 */
export function templateSections(
  code: string | null | undefined,
): WebsiteSection[] {
  const template =
    findTemplate(code ?? "") ?? findTemplate(DEFAULT_TEMPLATE_CODE);
  return template?.sections ?? WEBSITE_SECTIONS;
}

/**
 * The optional fields a business's template renders.
 *
 * Resolves the same way as `templateSections` — an unknown code falls back to
 * the default template, so the CMS always offers the inputs of the site that is
 * actually being rendered. An empty set is the safe answer of last resort: the
 * forms then show only the fields every template has.
 */
export function templateFields(
  code: string | null | undefined,
): TemplateFields {
  const template =
    findTemplate(code ?? "") ?? findTemplate(DEFAULT_TEMPLATE_CODE);
  return template?.fields ?? {};
}

/** A resolved template: the component to render and its default content. */
export interface TemplateDefinition {
  code: string;
  Component: ComponentType<{ business: BusinessProfile }>;
  /** Merge base for a tenant that hasn't customized a section yet. */
  defaultProfile: BusinessProfile;
}

/**
 * Resolve a template code to its component + defaults.
 *
 * Uses dynamic imports so a tenant only downloads the template it actually
 * uses. An unknown code falls back to the default template rather than failing
 * the page — a bad column value must never take a customer's site down.
 */
export async function loadTemplate(
  code: string | null | undefined,
): Promise<TemplateDefinition> {
  switch (code) {
    case "retreat-lodge": {
      const [{ LodgeRetreatTemplate }, { gloria }] = await Promise.all([
        import("./retreat/lodge"),
        import("@/lib/businesses/gloria"),
      ]);
      return {
        code: "retreat-lodge",
        Component: LodgeRetreatTemplate,
        defaultProfile: gloria,
      };
    }
    case "events-elegance": {
      const [{ EleganceEventsTemplate }, { bem }] = await Promise.all([
        import("./events/elegance"),
        import("@/lib/businesses/bem"),
      ]);
      return {
        code: "events-elegance",
        Component: EleganceEventsTemplate,
        defaultProfile: bem,
      };
    }
    case "patisserie-boutique": {
      const [{ BoutiquePatisserieTemplate }, { arah }] = await Promise.all([
        import("./patisserie/boutique"),
        import("@/lib/businesses/arah"),
      ]);
      return {
        code: "patisserie-boutique",
        Component: BoutiquePatisserieTemplate,
        defaultProfile: arah,
      };
    }
    case "barber-luxury":
    default: {
      const [{ LuxuryBarberTemplate }, { ronies }] = await Promise.all([
        import("./barber/luxury"),
        import("@/lib/businesses/ronies"),
      ]);
      return {
        code: "barber-luxury",
        Component: LuxuryBarberTemplate,
        defaultProfile: ronies,
      };
    }
  }
}

export function isValidTemplate(code: string): boolean {
  return findTemplate(code) !== null;
}

/** True when the theme exists for that template. */
export function isValidTheme(templateCode: string, themeCode: string): boolean {
  const template = findTemplate(templateCode);
  return template ? template.themes.some((t) => t.code === themeCode) : false;
}
