import { describe, it, expect } from "vitest";
import { gallerySchema, aboutSchema } from "@/schemas/website-content";
import { VisibilityService } from "@/services/visibility-service";
import type { Business } from "@/types/business-entity";

/**
 * Alt text is what a screen reader announces in place of an image, what image
 * search indexes, and what a vision model reads to caption a page.
 *
 * The defect this field fixes was subtle: the gallery passed `alt={item.title}`,
 * which satisfies every automated "has alt" check while doing none of alt
 * text's work. The title is rendered in the figcaption two lines below the
 * photo, so a screen-reader user heard the same words twice and learned nothing
 * about the picture. These tests exist to stop that shape coming back — as a
 * saved value, or as a score awarded for one.
 */

const item = (over: Record<string, unknown> = {}) => ({
  title: "SKIN FADE",
  by: "By Ronie",
  image: "https://example.com/a.jpg",
  ...over,
});

const gallery = (items: Record<string, unknown>[]) => ({
  heading: { label: "l", title: "t" },
  items,
});

const about = (over: Record<string, unknown> = {}) => ({
  label: "l",
  titleLines: ["A"],
  text: "t",
  features: [],
  cta: { label: "Go", href: "#contact" },
  image: "https://example.com/shop.jpg",
  badgeValue: "10+",
  badgeLabel: "Years",
  ...over,
});

describe("gallery alt text", () => {
  it("accepts a real description", () => {
    const parsed = gallerySchema.safeParse(
      gallery([item({ alt: "Close-up of a high skin fade tapered to the neckline" })]),
    );
    expect(parsed.success).toBe(true);
  });

  it("REFUSES an alt identical to the title", () => {
    // The precise defect. Allowing it would let the field be "filled in" and
    // the visibility point awarded without a single reader being better off.
    const parsed = gallerySchema.safeParse(gallery([item({ alt: "SKIN FADE" })]));
    expect(parsed.success).toBe(false);
  });

  it("refuses it regardless of case or padding", () => {
    const parsed = gallerySchema.safeParse(
      gallery([item({ alt: "  skin fade  " })]),
    );
    expect(parsed.success).toBe(false);
  });

  it("refuses a redundant 'photo of' opening", () => {
    // Assistive tech already announces the element as an image, so this is read
    // as "image, photo of a skin fade".
    for (const alt of [
      "Photo of a skin fade",
      "A photo of a skin fade",
      "Image of a skin fade",
      "picture showing a skin fade",
      "Screenshot of a skin fade",
    ]) {
      expect(gallerySchema.safeParse(gallery([item({ alt })])).success, alt).toBe(
        false,
      );
    }
  });

  it("does not refuse a description that merely mentions a photo", () => {
    // The rule targets the OPENING, not the word. "Photos of past cuts pinned
    // to the mirror" is a legitimate description.
    const parsed = gallerySchema.safeParse(
      gallery([item({ alt: "Photos of past cuts pinned around the mirror" })]),
    );
    expect(parsed.success).toBe(true);
  });

  it("treats blank as absent rather than storing an empty string", () => {
    const parsed = gallerySchema.parse(gallery([item({ alt: "   " })]));
    expect(parsed.items[0].alt).toBeUndefined();
  });

  it("stays optional, so existing content still saves", () => {
    expect(gallerySchema.safeParse(gallery([item()])).success).toBe(true);
  });
});

describe("about image alt", () => {
  it("is optional — blank means decorative, which is correct here", () => {
    // The about photo sits beside copy that carries the meaning, so alt=""
    // is the right default and a screen reader skips it.
    const parsed = aboutSchema.parse(about());
    expect(parsed.imageAlt).toBeUndefined();
  });

  it("accepts a description when the photo shows something the words don't", () => {
    const parsed = aboutSchema.parse(
      about({ imageAlt: "The shop floor with three barber chairs" }),
    );
    expect(parsed.imageAlt).toBe("The shop floor with three barber chairs");
  });

  it("applies the same redundant-prefix rule", () => {
    expect(
      aboutSchema.safeParse(about({ imageAlt: "Photo of the shop" })).success,
    ).toBe(false);
  });
});

describe("visibility check counts THIS tenant's described photos", () => {
  const business = (items: Record<string, unknown>[]): Business =>
    ({
      name: "Ronnie Barbershop",
      hours: [],
      content: {
        hero: null,
        about: null,
        services: null,
        barbers: null,
        gallery: { heading: { label: "l", title: "t" }, items },
        products: null,
        testimonials: null,
        faq: null,
        contact: null,
        footer: null,
      },
    }) as unknown as Business;

  const check = (b: Business) =>
    new VisibilityService().analyze(b).checks.find((c) => c.id === "image-alt")!;

  it("fails when photos exist but none are described", () => {
    // Previously a platform-level constant, which would have flipped every
    // client to pass the moment the field shipped — empty alts included.
    expect(check(business([item(), item()])).status).toBe("fail");
  });

  it("warns when only some are described", () => {
    const result = check(business([item({ alt: "A fresh taper" }), item()]));
    expect(result.status).toBe("warn");
    expect(result.finding).toContain("1 of 2");
  });

  it("passes when every photo is described", () => {
    const result = check(
      business([item({ alt: "A fresh taper" }), item({ alt: "A beard lineup" })]),
    );
    expect(result.status).toBe("pass");
  });

  it("does NOT count an alt that just repeats the title", () => {
    // Guards content stored before the save schema started refusing it.
    const result = check(business([item({ alt: "SKIN FADE" }), item()]));
    expect(result.status).toBe("fail");
  });

  it("does not name the logo or the cover any more", () => {
    // Both were wrong: the logo's alt is derived, and the cover is never
    // rendered as an <img> — it only feeds the JSON-LD `image` value.
    const result = check(business([item()]));
    expect(result.finding.toLowerCase()).not.toContain("logo");
    expect(result.finding.toLowerCase()).not.toContain("cover");
  });
});
