import { describe, it, expect } from "vitest";
import { testimonialsSchema } from "@/schemas/website-content";
import {
  buildBusinessProfile,
  deriveInitials,
  toTestimonial,
} from "@/lib/website/build-profile";
import { templateSections } from "@/templates/registry";
import type { BusinessProfile } from "@/types/business";
import type { Business } from "@/types/business-entity";

/**
 * Testimonials are published social proof carrying a named person and a star
 * rating, so two things matter: a tenant must own their own (never inherit the
 * template's demo quotes), and the rendered monogram must always agree with the
 * name printed beside it.
 */

const heading = { label: "Reviews", title: "WHAT CLIENTS SAY" };
const entry = {
  rating: 5,
  text: "Best barbershop in CDO, hands down.",
  author: "JUAN REYES",
  meta: "Regular Client · 3 Years",
};

describe("testimonialsSchema", () => {
  it("accepts a well-formed testimonial", () => {
    const parsed = testimonialsSchema.parse({ heading, items: [entry] });
    expect(parsed.items[0]!.rating).toBe(5);
  });

  it("wants a real number — the <select> converts, the schema does not", () => {
    // Deliberately not z.coerce: coercion widens the schema's input type to
    // `unknown`, which stops matching the form's value type. The field registers
    // with `valueAsNumber`, so a string reaching here means something bypassed
    // the form.
    expect(() =>
      testimonialsSchema.parse({ heading, items: [{ ...entry, rating: "4" }] }),
    ).toThrow();
    expect(
      testimonialsSchema.parse({ heading, items: [{ ...entry, rating: 4 }] })
        .items[0]!.rating,
    ).toBe(4);
  });

  it("bounds the rating to what the card can draw", () => {
    // The card renders one ★ per unit, so an unbounded value paints an
    // arbitrarily long row of stars.
    for (const rating of [0, 6, 99, -1, 2.5]) {
      expect(() =>
        testimonialsSchema.parse({ heading, items: [{ ...entry, rating }] }),
      ).toThrow();
    }
  });

  it("requires a quote and an author, but not the detail line", () => {
    expect(() =>
      testimonialsSchema.parse({ heading, items: [{ ...entry, text: "" }] }),
    ).toThrow();
    expect(() =>
      testimonialsSchema.parse({ heading, items: [{ ...entry, author: " " }] }),
    ).toThrow();
    expect(
      testimonialsSchema.parse({ heading, items: [{ ...entry, meta: "" }] })
        .items[0]!.meta,
    ).toBe("");
  });

  it("has no initials field — the monogram is derived, not entered", () => {
    const parsed = testimonialsSchema.parse({
      heading,
      items: [{ ...entry, initials: "ZZ" }],
    }) as { items: Record<string, unknown>[] };
    expect(parsed.items[0]!.initials).toBeUndefined();
  });

  it("requires at least one testimonial", () => {
    expect(() => testimonialsSchema.parse({ heading, items: [] })).toThrow();
  });
});

describe("deriveInitials", () => {
  it("takes the first and last words", () => {
    expect(deriveInitials("Juan Reyes")).toBe("JR");
    expect(deriveInitials("mark dela cruz")).toBe("MC");
  });

  it("handles a single name", () => {
    expect(deriveInitials("Ronie")).toBe("R");
  });

  it("tolerates padding and repeated spaces", () => {
    expect(deriveInitials("  Kyle   Santos  ")).toBe("KS");
  });

  it("keeps an astral first character whole", () => {
    // A naive [0] would slice a surrogate pair and render as a replacement box.
    expect(deriveInitials("𝒥uan Reyes")).toBe(
      ("𝒥" + "R").toUpperCase(),
    );
  });

  it("returns empty rather than throwing on a blank name", () => {
    expect(deriveInitials("   ")).toBe("");
  });
});

// ── Merge ───────────────────────────────────────────────────────────────────

const base = {
  brand: { namePrimary: "R", nameAccent: "B", initial: "R" },
  seo: { title: "t", description: "d" },
  hero: {},
  about: {},
  services: {},
  barbers: { heading, items: [] },
  gallery: {},
  products: {},
  testimonials: {
    heading: { label: "Reviews", title: "WHAT CLIENTS SAY" },
    items: [
      {
        rating: 5,
        text: "Demo quote.",
        author: "JUAN REYES",
        meta: "Regular",
        initials: "JR",
      },
    ],
  },
  contact: { details: [] },
  footer: { socials: [] },
} as unknown as BusinessProfile;

const business = (content: Partial<Business["content"]> = {}): Business =>
  ({
    name: "Second Barber",
    hours: [],
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      products: null,
      testimonials: null,
      contact: null,
      footer: null,
      ...content,
    },
  }) as unknown as Business;

describe("buildBusinessProfile — testimonials", () => {
  it("uses the tenant's own testimonials once they exist", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        testimonials: {
          heading: { label: "Reviews", title: "OUR CLIENTS" },
          items: [
            {
              rating: 4,
              text: "Great fade.",
              author: "Mark Dela Cruz",
              meta: "Walk-in",
            },
          ],
        },
      }),
    );

    expect(profile.testimonials.items).toEqual([
      {
        rating: 4,
        text: "Great fade.",
        author: "Mark Dela Cruz",
        meta: "Walk-in",
        initials: "MC",
      },
    ]);
  });

  it("falls back to the template default when nothing is stored", () => {
    expect(buildBusinessProfile(base, business()).testimonials).toBe(
      base.testimonials,
    );
  });
});

describe("toTestimonial", () => {
  it("derives the monogram so it cannot disagree with the name", () => {
    expect(toTestimonial({ ...entry, author: "Kyle Santos" })).toMatchObject({
      author: "Kyle Santos",
      initials: "KS",
    });
  });
});

describe("the barber template offers the section", () => {
  it("lists testimonials so the CMS shows it", () => {
    expect(templateSections("barber-luxury")).toContain("testimonials");
  });
});
