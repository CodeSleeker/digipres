import { describe, it, expect } from "vitest";
import { gloria } from "@/lib/businesses/gloria";
import { arah } from "@/lib/businesses/arah";
import { ronies } from "@/lib/businesses/ronies";
import {
  findTemplate,
  templateFields,
  templateSections,
  TEMPLATES,
} from "@/templates/registry";
import { sectionSchema, SECTION_SCHEMA } from "@/schemas/website-content";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import type { WebsiteSection } from "@/types/website-content";
import type { BusinessProfile } from "@/types/business";

/**
 * The retreat template's own invariants.
 *
 * The generic registry tests already prove it has a palette, that its sections
 * are storable and that its default profile doesn't leak a slug. What is left
 * is specific to this template: it is the first one whose design has NO price,
 * NO story button and NO badge, which is what the conditional section rules
 * were added for — so the rules and the content have to agree, in both
 * directions.
 */

const template = findTemplate("retreat-lodge");
const fields = templateFields("retreat-lodge");

describe("retreat/lodge registration", () => {
  it("is registered with a theme", () => {
    expect(template).not.toBeNull();
    expect(template!.themes.length).toBeGreaterThan(0);
  });

  it("offers every section it renders, and none it doesn't", () => {
    // No team, shop, testimonials or FAQ: a private house has no staff page and
    // no products, and its one quotation is a brand statement.
    // Order is the CMS navigation order. `retreat` leads so it sits directly
    // under Branding — the two entries that aren't ordinary page sections —
    // and the rest run top-to-bottom down the page.
    expect(template!.sections).toEqual([
      "retreat",
      "hero",
      "about",
      "services",
      "gallery",
      "journal",
      "faq",
      "contact",
      "footer",
    ]);
  });

  it("declares the optional fields it renders", () => {
    // The CMS builds its inputs from this. A field the template reads but does
    // not declare is a field the form won't render — and a save then drops it.
    //
    // `bookingOptions` for the enquiry form's "what kind of stay" dropdown,
    // and NOT `staffOptions`: a whole-property let has nobody to route to, so
    // the owner is never asked for a list their site has nowhere to show.
    expect(template!.fields).toEqual({
      heroBackdrop: true,
      bookingOptions: true,
      // The story's second paragraph. NOT `aboutEditorial`: this design has no
      // figures row and no sign-off, so offering them would collect content
      // the page can't print.
      aboutParagraphs: true,
    });
  });

  it("validates its own default content against the section schemas", () => {
    // Every declared section's default must survive the schema the CMS saves
    // through — otherwise an owner's first save of an untouched form fails.
    for (const section of template!.sections) {
      const result = sectionSchema(section, fields).safeParse(
        defaultFor(section),
      );
      expect(result.success, `${section}: ${JSON.stringify(result.error)}`).toBe(
        true,
      );
    }
  });

  /**
   * The whole point of the conditional rules.
   *
   * Under the shared rules a service needs a price and a story needs a button
   * and a badge. This design has nowhere to put any of the three, so seeding
   * them would mean inventing content — and then SHOWING it to an owner as
   * though they had written it.
   */
  it("saves a stay card with no price, and a story with no button or badge", () => {
    expect(sectionSchema("services", fields).safeParse(gloria.services).success)
      .toBe(true);
    expect(sectionSchema("about", fields).safeParse(gloria.about).success).toBe(
      true,
    );
  });

  it("still demands all three of a template that declares them", () => {
    // The relaxation follows the declaration, so it must NOT leak: the same
    // content is refused under the barber's rules.
    const strict = templateFields("barber-luxury");
    expect(sectionSchema("services", strict).safeParse(gloria.services).success)
      .toBe(false);
    expect(sectionSchema("about", strict).safeParse(gloria.about).success).toBe(
      false,
    );
    // And the strict record — the default for anything with no template in
    // hand — behaves the same way.
    expect(SECTION_SCHEMA.services.safeParse(gloria.services).success).toBe(
      false,
    );
  });

  it("leaves the other templates' content valid under the parameterised rules", () => {
    // Both declare the three flags, so nothing about their validation changed.
    for (const [profile, code] of [
      [ronies, "barber-luxury"],
      [arah, "patisserie-boutique"],
    ] as const) {
      const rules = templateFields(code);
      expect(
        sectionSchema("services", rules).safeParse(profile.services).success,
        `${code} services`,
      ).toBe(true);
      expect(
        sectionSchema("about", rules).safeParse(profile.about).success,
        `${code} about`,
      ).toBe(true);
    }
  });

  /**
   * A save writes back what the schema parsed. If parsing the template's own
   * defaults dropped a field the template reads, an owner who opened the form
   * and pressed save without typing anything would lose it.
   */
  it("round-trips every rendered field through its schema untouched", () => {
    const hero = sectionSchema("hero", fields).parse(gloria.hero) as
      BusinessProfile["hero"];
    expect(hero.image).toBe(gloria.hero.image);
    expect(hero.imageAlt).toBe(gloria.hero.imageAlt);
    // The emphasised closing line, which this design sets in italic.
    expect(hero.titleLines.at(-1)?.stroke).toBe(true);

    const about = sectionSchema("about", fields).parse(gloria.about) as
      BusinessProfile["about"];
    expect(about.paragraphs).toHaveLength(1);
    expect(about.features).toEqual(gloria.about.features);

    const services = sectionSchema("services", fields).parse(
      gloria.services,
    ) as BusinessProfile["services"];
    expect(services.items).toHaveLength(gloria.services.items.length);
    expect(services.heading.subtitle).toBe(gloria.services.heading.subtitle);

    const gallery = sectionSchema("gallery", fields).parse(gloria.gallery) as
      BusinessProfile["gallery"];
    expect(gallery.items.at(-1)?.wide).toBe(true);
    expect(gallery.items[0]!.caption).toBe(gloria.gallery.items[0]!.caption);
  });

  /**
   * No template carries content it cannot maintain.
   *
   * The generic version of this lives in the patisserie suite; this one covers
   * the flags added for the retreat, across every registered template, so a
   * future template can't quietly seed a price it never prints.
   */
  it("leaves every undeclared field empty in all templates", () => {
    const profiles: Record<string, BusinessProfile> = {
      "barber-luxury": ronies,
      "patisserie-boutique": arah,
      "retreat-lodge": gloria,
    };

    for (const { code } of TEMPLATES) {
      const profile = profiles[code];
      expect(profile, `no profile registered for ${code}`).toBeTruthy();
      const declared = templateFields(code);

      if (!declared.itemPricing) {
        for (const item of profile!.services.items) {
          expect(item.price, `${code} service price`).toBeFalsy();
          expect(item.unit, `${code} service unit`).toBeFalsy();
        }
      }
      if (!declared.aboutCta) {
        expect(profile!.about.cta.label, `${code} about cta`).toBeFalsy();
        expect(profile!.about.cta.href, `${code} about cta href`).toBeFalsy();
      }
      if (!declared.aboutBadge) {
        expect(profile!.about.badgeValue, `${code} badge value`).toBeFalsy();
        expect(profile!.about.badgeLabel, `${code} badge label`).toBeFalsy();
      }
      if (!declared.heroPhoto && !declared.heroBackdrop) {
        expect(profile!.hero.image, `${code} hero image`).toBeFalsy();
      }
      // The backdrop is the picture and its description ONLY.
      if (declared.heroBackdrop) {
        expect(profile!.hero.badge, `${code} hero badge`).toBeFalsy();
        expect(profile!.hero.proof, `${code} hero proof`).toBeFalsy();
        expect(profile!.hero.card, `${code} hero card`).toBeFalsy();
      }
      /*
       * The enquiry dropdowns.
       *
       * This is the one the CMS actually leaked: every tenant was shown a
       * "Barber options" list, including two templates whose sites have no
       * booking form to put it in. Options typed there were stored and shown to
       * nobody.
       */
      if (!declared.bookingOptions) {
        expect(profile!.contact.serviceOptions, `${code} service options`)
          .toEqual([]);
      }
      if (!declared.staffOptions) {
        expect(profile!.contact.barberOptions, `${code} staff options`)
          .toEqual([]);
      }
      if (!declared.galleryCredit) {
        for (const item of profile!.gallery.items) {
          expect(item.by, `${code} gallery credit`).toBeFalsy();
        }
      }
      /*
       * The story's extra parts, each behind the flag that offers it.
       *
       * This is the check that was missing when the retreat shipped a second
       * paragraph it rendered and the CMS never offered — the equivalent loop
       * in the patisserie suite covers `aboutEditorial`, but only iterates the
       * barber and the patisserie, so the retreat walked straight past it.
       */
      if (!declared.aboutEditorial && !declared.aboutParagraphs) {
        expect(profile!.about.paragraphs ?? [], `${code} paragraphs`).toEqual(
          [],
        );
      }
      if (!declared.aboutEditorial) {
        expect(profile!.about.stats ?? [], `${code} about stats`).toEqual([]);
        expect(profile!.about.signature, `${code} signature`).toBeFalsy();
      }
    }
  });
});

describe("retreat/lodge content", () => {
  it("carries the template-only sections it renders", () => {
    const retreat = gloria.retreat!;
    expect(retreat.experience.items).toHaveLength(3);
    expect(retreat.imageBreak.titleLines.length).toBeGreaterThan(1);
    expect(retreat.quote.text).toBeTruthy();
    expect(retreat.place.locality).toBeTruthy();
    expect(retreat.stayImage.src).toBeTruthy();
    expect(retreat.bookingImage).toBeTruthy();
  });

  it("keeps its CMS sections free of retreat-only content", () => {
    // The extras live in their own namespace precisely so a section save can't
    // reach them. If one migrates into an editable section, this fails.
    expect(gloria.patisserie).toBeUndefined();
    expect(gloria.craft).toBeUndefined();
    expect(arah.retreat).toBeUndefined();
    expect(ronies.retreat).toBeUndefined();
  });

  it("describes every photograph it renders", () => {
    // Alt text is not optional on this template: the page is largely pictures,
    // and a reader who can't see them would otherwise get a list of nothing.
    expect(gloria.hero.imageAlt).toBeTruthy();
    expect(gloria.about.imageAlt).toBeTruthy();
    for (const item of gloria.gallery.items) {
      expect(item.alt, item.title).toBeTruthy();
      // The schema refuses alt that merely repeats the title; the seed must not
      // be written that way either.
      expect(item.alt!.toLowerCase()).not.toBe(item.title.toLowerCase());
    }
    const retreat = gloria.retreat!;
    expect(retreat.stayImage.alt).toBeTruthy();
    expect(retreat.imageBreak.imageAlt).toBeTruthy();
    expect(retreat.location.imageAlt).toBeTruthy();
  });

  /**
   * The mockup's five-tile composition, reproduced from ordinary content: four
   * mosaic shapes and one full-width tile. If the seed loses its `wide` item
   * the gallery still renders — it just stops being the approved layout.
   */
  it("marks exactly one gallery tile as full width", () => {
    const wide = gloria.gallery.items.filter((item) => item.wide);
    expect(wide).toHaveLength(1);
    expect(gloria.gallery.items.at(-1)?.wide).toBe(true);
  });

  it("renders no team, shop or testimonials, and offers none", () => {
    expect(gloria.barbers.items).toEqual([]);
    expect(gloria.products.items).toEqual([]);
    expect(gloria.testimonials.items).toEqual([]);

    const sections = templateSections("retreat-lodge");
    for (const section of ["barbers", "products", "testimonials"]) {
      expect(sections).not.toContain(section);
    }
  });

  /**
   * The FAQ ships with starter questions, so the section is visible from day
   * one and an owner edits rather than facing a blank form.
   *
   * These are also published as FAQPage structured data, which is what makes
   * the CONTENT of the default a correctness question and not a copy one: a
   * tenant who never edits them is telling search engines these answers are
   * true of their property. The rule the seed follows is below.
   */
  it("ships starter questions the owner can edit", () => {
    expect(templateSections("retreat-lodge")).toContain("faq");
    expect(gloria.faq.items.length).toBeGreaterThanOrEqual(3);
    expect(gloria.faq.heading.label).toBeTruthy();
    expect(gloria.faq.heading.title).toBeTruthy();
  });

  /**
   * No seeded answer states a figure.
   *
   * A time, a price or a headcount in a default is a claim about a real
   * property that nobody checked — and one that would be published as
   * structured data. The seeded answers either hold for any whole-house let or
   * point the reader at something on the page, so the worst case is vagueness
   * rather than a lie.
   */
  it("states no checkable figure in a seeded answer", () => {
    for (const item of gloria.faq.items) {
      expect(
        /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\bPHP|₱|\b\d+\s*(guests|people|bedrooms|nights)\b/i.test(
          item.answer,
        ),
        `"${item.question}" states a figure`,
      ).toBe(false);
    }
  });

  it("points its location button at a real destination", () => {
    // The template renders the button only for a real link, so a placeholder
    // "#" would silently remove it from the approved design.
    const href = gloria.retreat!.location.mapCta.href;
    expect(href.startsWith("https://")).toBe(true);
  });
});

/** The default content the CMS would prefill an untouched form with. */
function defaultFor(section: WebsiteSection): unknown {
  switch (section) {
    case "contact":
      // Contact/footer store only their non-scalar half; the rest is derived
      // from the business columns at render time.
      return {
        label: gloria.contact.label,
        titleLines: gloria.contact.titleLines,
        intro: gloria.contact.intro,
        serviceOptions: gloria.contact.serviceOptions,
        barberOptions: gloria.contact.barberOptions,
      };
    case "footer":
      return {
        description: gloria.footer.description,
        columns: gloria.footer.columns,
        copyright: gloria.footer.copyright,
        credit: gloria.footer.credit,
      };
    default:
      return gloria[
        section as "hero" | "about" | "services" | "gallery" | "journal"
      ];
  }
}

/**
 * The template's own blocks, made editable (migration 0039).
 *
 * They were rendered from the template default and offered nowhere: an owner
 * could rewrite all four cards in "The Stay" and not the photograph between
 * them. These pin that every one of them now round-trips through the CMS, and
 * that clearing a block's essential field is what removes it.
 */
describe("retreat/lodge own blocks", () => {
  it("offers the section, and ships a default for it", () => {
    expect(templateSections("retreat-lodge")).toContain("retreat");
    expect(gloria.retreat).toBeTruthy();
  });

  it("is offered to no other template", () => {
    expect(templateSections("barber-luxury")).not.toContain("retreat");
    expect(templateSections("patisserie-boutique")).not.toContain("retreat");
  });

  it("validates its own default against the schema the CMS saves through", () => {
    const result = SECTION_SCHEMA.retreat.safeParse(gloria.retreat);
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  /**
   * Every block the page renders has to survive the save, or an owner who
   * opened the form and pressed save without typing would lose it.
   */
  it("round-trips every block the page renders", () => {
    const parsed = SECTION_SCHEMA.retreat.parse(
      gloria.retreat,
    ) as NonNullable<typeof gloria.retreat>;

    expect(parsed.place.locality).toBe(gloria.retreat!.place.locality);
    expect(parsed.introCaption).toBe(gloria.retreat!.introCaption);
    expect(parsed.stayImage.src).toBe(gloria.retreat!.stayImage.src);
    expect(parsed.imageBreak.image).toBe(gloria.retreat!.imageBreak.image);
    expect(parsed.imageBreak.titleLines).toHaveLength(2);
    expect(parsed.experience.items).toHaveLength(3);
    expect(parsed.location.image).toBe(gloria.retreat!.location.image);
    expect(parsed.location.mapCta.href).toBe(
      gloria.retreat!.location.mapCta.href,
    );
    expect(parsed.quote.text).toBe(gloria.retreat!.quote.text);
    expect(parsed.bookingImage).toBe(gloria.retreat!.bookingImage);
  });

  /** Clearing a block is a legitimate save, and how an owner removes it. */
  it("accepts a cleared block rather than refusing the save", () => {
    const emptied = SECTION_SCHEMA.retreat.parse({
      ...gloria.retreat,
      imageBreak: { titleLines: [], note: "", image: "", imageAlt: "" },
      experience: { label: "", titleLines: [], items: [] },
      quote: { text: "", attribution: "" },
      stayImage: { src: "", alt: "" },
      bookingImage: "",
    }) as NonNullable<typeof gloria.retreat>;

    expect(emptied.imageBreak.image).toBeUndefined();
    expect(emptied.experience.items).toEqual([]);
    expect(emptied.quote.text).toBe("");
    expect(emptied.stayImage.src).toBeUndefined();
  });

  it("still refuses a half-written experience note", () => {
    // Blank is how you remove a note; a title with no description is a mistake.
    const result = SECTION_SCHEMA.retreat.safeParse({
      ...gloria.retreat,
      experience: {
        label: "The Experience",
        titleLines: ["Less rush."],
        items: [{ title: "Wake Slowly", description: "" }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("prefers the tenant's own blocks over the template's", () => {
    const stored = {
      ...gloria.retreat!,
      quote: { text: "Ours", attribution: "Us" },
    };
    const profile = buildBusinessProfile(gloria, {
      slug: "tenant",
      name: "Tenant",
      hours: [],
      content: { ...emptyContent, retreat: stored },
    } as never);
    expect(profile.retreat?.quote.text).toBe("Ours");
  });
});

/** A blank WebsiteContent, for the merge test above. */
const emptyContent = {
  hero: null,
  about: null,
  services: null,
  barbers: null,
  gallery: null,
  journal: null,
  retreat: null,
  products: null,
  testimonials: null,
  faq: null,
  contact: null,
  footer: null,
};
