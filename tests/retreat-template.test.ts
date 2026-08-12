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
    expect(template!.sections).toEqual([
      "hero",
      "about",
      "services",
      "gallery",
      "journal",
      "contact",
      "footer",
    ]);
  });

  it("declares the optional fields it renders", () => {
    // The CMS builds its inputs from this. A field the template reads but does
    // not declare is a field the form won't render — and a save then drops it.
    expect(template!.fields).toEqual({ heroBackdrop: true });
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

  it("renders no team, shop, testimonials or FAQ, and offers none", () => {
    expect(gloria.barbers.items).toEqual([]);
    expect(gloria.products.items).toEqual([]);
    expect(gloria.testimonials.items).toEqual([]);
    expect(gloria.faq.items).toEqual([]);

    const sections = templateSections("retreat-lodge");
    for (const section of ["barbers", "products", "testimonials", "faq"]) {
      expect(sections).not.toContain(section);
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
