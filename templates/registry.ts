import type { ComponentType } from "react";
import type { BusinessProfile } from "@/types/business";
import {
  WEBSITE_SECTIONS,
  type WebsiteSection,
} from "@/types/website-content";

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
  /** A still hero photograph, with its status pill, proof strip and slot card. */
  heroPhoto?: boolean;
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
