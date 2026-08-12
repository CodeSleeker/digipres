import { describe, it, expect } from "vitest";
import { contactLine } from "@/lib/website/contact-line";
import {
  SOCIALS_DETAIL_TITLE,
  buildBusinessProfile,
} from "@/lib/website/build-profile";
import { ronies } from "@/lib/businesses/ronies";
import type { Business } from "@/types/business-entity";

/**
 * Contact detail lines reach a template as plain strings — `buildContactDetails`
 * composes them from the tenant's own columns and nothing carries a type
 * alongside them, so the shape of the string is all there is to classify by.
 *
 * These rules are shared by two templates, which is the point: a phone number
 * is a phone number on every design, and a regex that gets one wrong should be
 * wrong in one place.
 */

describe("contactLine", () => {
  it("makes a phone number diallable, in the formats owners actually type", () => {
    for (const line of [
      "+63 917 123 4567",
      "0917 123 4567",
      "(088) 555 0134",
      "0917-123-4567",
    ]) {
      const { kind, href } = contactLine(line);
      expect(kind, line).toBe("phone");
      expect(href, line).toMatch(/^tel:\+?\d+$/);
    }
  });

  it("strips formatting from the href but not from what is read", () => {
    // `tel:` wants the diallable digits; a reader wants the spacing. Both.
    expect(contactLine("+63 917 123 4567").href).toBe("tel:+639171234567");
    expect(contactLine("(088) 555 0134").href).toBe("tel:0885550134");
  });

  it("makes an email address writable", () => {
    const { kind, href } = contactLine("hello@example.ph");
    expect(kind).toBe("email");
    expect(href).toBe("mailto:hello@example.ph");
  });

  it("trims before deciding, and before building the href", () => {
    // Lines are composed by joining stored values; a stray space must not turn
    // a phone number into plain text or a mailto: into a broken one.
    expect(contactLine("  hello@example.ph  ").href).toBe(
      "mailto:hello@example.ph",
    );
    expect(contactLine("  0917 123 4567 ").kind).toBe("phone");
  });

  it("leaves everything else as text", () => {
    for (const line of [
      "Dahilayan, Manolo Fortich",
      "Mon: 9:00 AM — 6:00 PM",
      "From 2pm",
      "Facebook · Instagram",
      "",
    ]) {
      const { kind, href } = contactLine(line);
      expect(kind, line).toBe("text");
      expect(href, line).toBeNull();
    }
  });

  /**
   * The near-misses. A house number or a year is not a phone number, and
   * linking one produces a `tel:` that dials nothing — worse than plain text,
   * because it looks like it works.
   */
  it("does not mistake short numbers or dates for phone numbers", () => {
    for (const line of ["24", "2026", "9000", "1-2"]) {
      expect(contactLine(line).kind, line).toBe("text");
    }
  });

  it("does not treat a bare word with an @ as an email", () => {
    for (const line of ["find us @thelodge", "a@b", "@handle"]) {
      expect(contactLine(line).kind, line).toBe("text");
    }
  });
});

const business = (over: Partial<Business> = {}): Business =>
  ({
    slug: "tenant",
    name: "Tenant",
    hours: [],
    address: "Somewhere",
    phone: null,
    email: null,
    facebookUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    googleReviewUrl: null,
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      journal: null,
      products: null,
      testimonials: null,
      faq: null,
      contact: null,
      footer: null,
    },
    ...over,
  }) as unknown as Business;

/**
 * The email an owner types in Settings used to reach the LocalBusiness JSON-LD
 * and nothing else — so a search engine had the address and the person reading
 * the page did not. It is now a detail line like the phone, which the templates
 * turn into a `mailto:`.
 */
describe("email detail", () => {
  const emailCard = (b: Business) =>
    buildBusinessProfile(ronies, b).contact.details.find(
      (d) => d.title === "EMAIL",
    );

  it("puts the owner's address on the page", () => {
    const card = emailCard(business({ email: "hello@example.ph" }));
    expect(card?.lines).toEqual(["hello@example.ph"]);
  });

  it("is a mailto: by the time a template renders it", () => {
    // The card carries a plain string; what makes it actionable is the shared
    // classification the templates run over every line.
    const line = emailCard(business({ email: "hello@example.ph" }))!.lines[0]!;
    expect(contactLine(line)).toEqual({
      kind: "email",
      href: "mailto:hello@example.ph",
    });
  });

  it("is absent for an owner who has not set one", () => {
    // No card rather than an empty one — the same rule the phone and hours
    // cards follow.
    expect(emailCard(business())).toBeUndefined();
  });

  it("sits between the phone and the socials", () => {
    // The order someone actually tries to make contact: come here, we're open
    // then, ring us, write to us, find us elsewhere.
    const details = buildBusinessProfile(
      ronies,
      business({
        phone: "0917 123 4567",
        email: "hello@example.ph",
        facebookUrl: "https://facebook.com/tenant",
      }),
    ).contact.details;

    const titles = details.map((d) => d.title);
    expect(titles.indexOf("EMAIL")).toBeGreaterThan(titles.indexOf("PHONE"));
    expect(titles.indexOf("EMAIL")).toBeLessThan(
      titles.indexOf(SOCIALS_DETAIL_TITLE),
    );
  });
});

describe("socials card title", () => {
  it("is shared, not matched by hand", () => {
    // The retreat replaces this card with real links, so it has to recognise
    // it. Matching the string in two files is how that breaks the first time
    // one of them is reworded.
    expect(SOCIALS_DETAIL_TITLE).toBe("SOCIALS");
  });
});
