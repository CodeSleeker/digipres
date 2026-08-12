import { describe, it, expect } from "vitest";
import { arah } from "@/lib/businesses/arah";
import { ronies } from "@/lib/businesses/ronies";
import {
  findTemplate,
  templateFields,
  templateSections,
} from "@/templates/registry";
import { SECTION_SCHEMA } from "@/schemas/website-content";
import type { WebsiteSection } from "@/types/website-content";

/**
 * The patisserie template's own invariants.
 *
 * The generic registry tests already prove it has a palette, that its sections
 * are storable and that its default profile doesn't leak a slug. What is left
 * is the part specific to this template: the sections it declares must be
 * losslessly editable through the CMS forms that exist, and the sections it
 * renders from template content must actually carry that content.
 */

const template = findTemplate("patisserie-boutique");

describe("patisserie/boutique registration", () => {
  it("is registered with a theme", () => {
    expect(template).not.toBeNull();
    expect(template!.themes.length).toBeGreaterThan(0);
  });

  it("offers every section it renders, and no team section", () => {
    expect(template!.sections).toEqual([
      "hero",
      "about",
      "services",
      "products",
      "gallery",
      "testimonials",
      "faq",
      "contact",
      "footer",
    ]);
  });

  it("declares the optional fields it renders", () => {
    // The CMS builds its inputs from this. A field the template reads but does
    // not declare is a field the form won't render — and a save then drops it.
    expect(template!.fields).toEqual({
      heroPhoto: true,
      itemPhotos: true,
      // Added when the rules became per-template: these three used to be
      // unconditional, so declaring them here is what KEEPS this template's
      // validation exactly as it was. `aboutCta` is declared but not rendered
      // — see the note beside it in the registry.
      itemPricing: true,
      aboutBadge: true,
      aboutCta: true,
      aboutEditorial: true,
      headingLinks: true,
    });
  });

  it("validates its own default content against the section schemas", () => {
    // Every declared section's default must survive the schema the CMS saves
    // through — otherwise an owner's first save of an untouched form fails.
    for (const section of template!.sections) {
      const value = defaultFor(section);
      const result = SECTION_SCHEMA[section].safeParse(value);
      expect(result.success, `${section}: ${JSON.stringify(result.error)}`).toBe(
        true,
      );
    }
  });

  /**
   * The invariant the whole `fields` mechanism exists to protect.
   *
   * A save writes back what the schema parsed. If parsing the template's own
   * defaults dropped a field the template reads, then an owner who opened the
   * form and pressed save without typing anything would lose it — the most
   * ordinary thing a person can do in a CMS.
   */
  it("round-trips every rendered field through its schema untouched", () => {
    const services = SECTION_SCHEMA.services.parse(arah.services);
    expect(services.heading.link?.label).toBe("See the full menu");
    expect(services.items[0]!.image).toBe(arah.services.items[0]!.image);
    expect(services.items[0]!.tag).toBe("Signature");
    expect(services.items[0]!.meta).toBe("Serves 12–14");

    const products = SECTION_SCHEMA.products.parse(arah.products);
    expect(products.items[0]!.image).toBe(arah.products.items[0]!.image);
    expect(products.items[0]!.meta).toBe("Whole, 7 inch");

    const hero = SECTION_SCHEMA.hero.parse(arah.hero);
    expect(hero.image).toBe(arah.hero.image);
    expect(hero.badge).toBe(arah.hero.badge);
    expect(hero.proof?.avatars).toHaveLength(4);
    expect(hero.proof?.highlight).toBe("4.9 average");
    expect(hero.card?.progress).toBe(70);

    const about = SECTION_SCHEMA.about.parse(arah.about);
    expect(about.paragraphs).toHaveLength(2);
    expect(about.stats).toHaveLength(3);
    expect(about.signature?.name).toBe("Arah");

    const gallery = SECTION_SCHEMA.gallery.parse(arah.gallery);
    expect(gallery.heading.link?.label).toBe("Follow on Instagram");
    expect(gallery.items[0]!.width).toBe(700);
    expect(gallery.items[0]!.height).toBe(900);
  });

  /**
   * The masonry lays out from the photographs' own proportions, so every seeded
   * item carries them — and carries BOTH, since one without the other describes
   * nothing and would silently fall back to an invented ratio.
   */
  it("gives every gallery photograph its real proportions", () => {
    for (const item of arah.gallery.items) {
      expect(item.width, item.title).toBeGreaterThan(0);
      expect(item.height, item.title).toBeGreaterThan(0);
    }
    // Not all the same shape — a masonry of identical tiles is a grid.
    const shapes = new Set(
      arah.gallery.items.map((i) => `${i.width}x${i.height}`),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });

  it("accepts a gallery whose photographs were never measured", () => {
    // The pre-existing case: content saved before the CMS measured anything.
    // It must parse, and the template falls back to a fixed ratio.
    const legacy = SECTION_SCHEMA.gallery.parse({
      ...arah.gallery,
      items: arah.gallery.items.map(({ width, height, ...rest }) => {
        void width;
        void height;
        return rest;
      }),
    });
    expect(legacy.items[0]!.width).toBeUndefined();
    expect(legacy.items[0]!.height).toBeUndefined();
  });

  it("drops a dimension that isn't a usable number instead of failing the save", () => {
    // An empty number input arrives as NaN. Losing a masonry hint is a shrug;
    // refusing to save the owner's caption because of it is not.
    const parsed = SECTION_SCHEMA.gallery.parse({
      ...arah.gallery,
      items: [
        { ...arah.gallery.items[0]!, width: Number.NaN, height: -4 },
        ...arah.gallery.items.slice(1),
      ],
    });
    expect(parsed.items[0]!.width).toBeUndefined();
    expect(parsed.items[0]!.height).toBeUndefined();
    expect(parsed.items[0]!.title).toBe(arah.gallery.items[0]!.title);
  });

  /**
   * The blocks are all-or-nothing: an owner who clears the field the block
   * hangs on gets no block, rather than an empty card with a stray arrow.
   */
  it("drops an optional block when the field it hangs on is cleared", () => {
    const hero = SECTION_SCHEMA.hero.parse({
      ...arah.hero,
      proof: { ...arah.hero.proof!, highlight: "  " },
      card: { ...arah.hero.card!, title: "" },
    });
    expect(hero.proof).toBeUndefined();
    expect(hero.card).toBeUndefined();

    const services = SECTION_SCHEMA.services.parse({
      ...arah.services,
      heading: { ...arah.services.heading, link: { label: "", href: "" } },
    });
    expect(services.heading.link).toBeUndefined();
  });

  /**
   * The barber's content must still parse now that both templates share these
   * schemas — its icons are set, its photographs are not, and neither is a
   * defect.
   */
  it("leaves the barber's content valid under the widened schemas", () => {
    const services = SECTION_SCHEMA.services.parse(ronies.services);
    expect(services.items[0]!.icon).toBeTruthy();
    expect(services.items[0]!.image).toBeUndefined();
    expect(services.heading.link).toBeUndefined();

    const hero = SECTION_SCHEMA.hero.parse(ronies.hero);
    expect(hero.stats.length).toBeGreaterThan(0);
    expect(hero.proof).toBeUndefined();
    expect(hero.image).toBeUndefined();
  });

  /**
   * No template carries content it cannot edit.
   *
   * Forms render only the inputs their template declares, and rely on
   * react-hook-form retaining the values behind the rest. This makes that
   * reliance moot rather than merely documented: the fields a template hides
   * are exactly the fields it leaves empty, so there is nothing there to lose
   * even if the retention ever changed.
   *
   * Fails loudly if someone gives a template content it has no way to maintain.
   */
  it("leaves every undeclared field empty in both templates", () => {
    const cases: { profile: typeof arah; code: string }[] = [
      { profile: arah, code: "patisserie-boutique" },
      { profile: ronies, code: "barber-luxury" },
    ];

    for (const { profile, code } of cases) {
      const declared = templateFields(code);

      if (!declared.itemPhotos) {
        for (const item of profile.services.items) {
          expect(item.image, `${code} service image`).toBeFalsy();
          expect(item.meta, `${code} service meta`).toBeFalsy();
          expect(item.tag, `${code} service tag`).toBeFalsy();
        }
        for (const item of profile.products.items) {
          expect(item.image, `${code} product image`).toBeFalsy();
          expect(item.meta, `${code} product meta`).toBeFalsy();
        }
      }
      if (!declared.itemIcons) {
        for (const item of profile.services.items) {
          expect(item.icon, `${code} service icon`).toBeFalsy();
        }
      }
      if (!declared.heroPhoto) {
        expect(profile.hero.image, code).toBeFalsy();
        expect(profile.hero.badge, code).toBeFalsy();
        expect(profile.hero.proof, code).toBeFalsy();
        expect(profile.hero.card, code).toBeFalsy();
      }
      if (!declared.heroStats) {
        expect(profile.hero.stats, code).toEqual([]);
      }
      if (!declared.aboutEditorial) {
        expect(profile.about.paragraphs ?? [], code).toEqual([]);
        expect(profile.about.stats ?? [], code).toEqual([]);
        expect(profile.about.signature, code).toBeFalsy();
      }
      if (!declared.aboutFeatures) {
        expect(profile.about.features, code).toEqual([]);
      }
      if (!declared.headingLinks) {
        for (const section of [
          profile.services,
          profile.products,
          profile.gallery,
          profile.testimonials,
        ]) {
          expect(section.heading.link, code).toBeFalsy();
        }
      }
    }
  });

  it("keeps its CMS sections free of patisserie-only content", () => {
    // The extras live in their own namespace precisely so a section save can't
    // reach them. If one migrates into an editable section, this fails.
    expect(arah.patisserie).toBeTruthy();
    expect(arah.gallery).not.toHaveProperty("aside");
  });

  /**
   * The sign-up copy is the exception, and deliberately so: it moved OUT of the
   * patisserie-only namespace and into the footer section when the mailing list
   * became real, because it is copy an owner should be able to edit. So it has
   * to survive the footer schema, unlike the extras above.
   */
  it("round-trips the sign-up copy through the footer schema", () => {
    const stored = SECTION_SCHEMA.footer.parse({
      description: arah.footer.description,
      columns: arah.footer.columns,
      copyright: arah.footer.copyright,
      credit: arah.footer.credit,
      newsletter: arah.footer.newsletter,
    });
    expect(stored.newsletter?.title).toBe("The Sunday list");
    expect(stored.newsletter?.consent).toContain("Unsubscribe");
  });

  it("drops the sign-up block when its heading is cleared", () => {
    // How an owner removes the box from their own site.
    const stored = SECTION_SCHEMA.footer.parse({
      description: arah.footer.description,
      columns: arah.footer.columns,
      copyright: arah.footer.copyright,
      credit: arah.footer.credit,
      newsletter: { ...arah.footer.newsletter!, title: "  " },
    });
    expect(stored.newsletter).toBeUndefined();
  });
});

describe("patisserie/boutique content", () => {
  it("carries the sections the template renders from template content", () => {
    expect(arah.services.items.length).toBeGreaterThan(0);
    expect(arah.products.items.length).toBeGreaterThan(0);
    expect(arah.patisserie!.customCakes.steps.length).toBeGreaterThan(0);
    expect(arah.patisserie!.customCakes.images.length).toBe(2);
  });

  it("gives every menu item and best seller a photograph with alt text", () => {
    // This template leads with pictures where the barber leads with a glyph, so
    // a missing image is a blank tile rather than a smaller card.
    for (const item of arah.services.items) {
      expect(item.image, item.title).toBeTruthy();
      expect(item.imageAlt, item.title).toBeTruthy();
    }
    for (const item of arah.products.items) {
      expect(item.image, item.name).toBeTruthy();
      expect(item.imageAlt, item.name).toBeTruthy();
    }
  });

  it("renders no team section, and offers none", () => {
    // A patisserie has no barbers. The profile carries the required field empty
    // and the CMS is never given the chance to fill it.
    expect(arah.barbers.items).toEqual([]);
    expect(templateSections("patisserie-boutique")).not.toContain("barbers");
  });

  it("carries no checklist, because its story section has no room for one", () => {
    // Declared nowhere and rendered nowhere. Pinned so the two stay in step: a
    // field the CMS can't produce must not appear in the markup.
    expect(arah.about.features).toEqual([]);
    expect(templateFields("patisserie-boutique").aboutFeatures).toBeFalsy();
  });

  it("leaves the barber-only sections alone", () => {
    // `craft` is optional on the profile for exactly this reason.
    expect(arah.craft).toBeUndefined();
    expect(ronies.craft).toBeTruthy();
    expect(ronies.patisserie).toBeUndefined();
  });
});

/** The default content the CMS would prefill an untouched form with. */
function defaultFor(section: WebsiteSection): unknown {
  switch (section) {
    case "contact":
      // Contact/footer store only their non-scalar half; the rest is derived
      // from the business columns at render time.
      return {
        label: arah.contact.label,
        titleLines: arah.contact.titleLines,
        intro: arah.contact.intro,
        serviceOptions: arah.contact.serviceOptions,
        barberOptions: arah.contact.barberOptions,
      };
    case "footer":
      return {
        description: arah.footer.description,
        columns: arah.footer.columns,
        copyright: arah.footer.copyright,
        credit: arah.footer.credit,
      };
    case "testimonials":
      // `initials` is derived at render time; the stored shape has no field for
      // it, exactly as the CMS form prefills it.
      return {
        heading: arah.testimonials.heading,
        items: arah.testimonials.items.map(({ rating, text, author, meta }) => ({
          rating,
          text,
          author,
          meta,
        })),
      };
    default:
      return arah[
        section as "hero" | "about" | "services" | "products" | "gallery" | "faq"
      ];
  }
}
