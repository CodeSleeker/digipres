import { describe, it, expect } from "vitest";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { updateBusinessSchema } from "@/schemas/business";
import type { BusinessProfile } from "@/types/business";
import type { Business } from "@/types/business-entity";

/**
 * Social links are stored ONCE on the business record and read by three
 * consumers: the footer icons, the contact SOCIALS card, and JSON-LD `sameAs`.
 * They render as live `<a href>`, so the scheme rule is a security boundary.
 */

const base = {
  brand: { namePrimary: "R", nameAccent: "B", initial: "R" },
  seo: { title: "t", description: "d" },
  hero: {},
  about: {},
  services: {},
  barbers: {},
  gallery: {},
  products: {},
  testimonials: {},
  nav: [],
  faq: { heading: { label: "l", title: "t" }, items: [] },
  contact: {
    label: "l",
    titleLines: [],
    intro: "i",
    details: [{ icon: "x", title: "FALLBACK", lines: ["demo"] }],
    serviceOptions: [],
    barberOptions: [],
  },
  footer: {
    description: "d",
    columns: [],
    copyright: "c",
    credit: "c",
    // The template's demo socials — dead links, must never reach a live site.
    socials: [
      { label: "FB", href: "#", ariaLabel: "Facebook" },
      { label: "IG", href: "#", ariaLabel: "Instagram" },
      { label: "TK", href: "#", ariaLabel: "TikTok" },
    ],
  },
} as unknown as BusinessProfile;

const business = (over: Partial<Business> = {}): Business =>
  ({
    name: "Ronies Barber",
    hours: [],
    address: "Somewhere",
    phone: null,
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
      products: null,
      testimonials: null,
      contact: null,
      footer: null,
    },
    ...over,
  }) as unknown as Business;

describe("footer socials — an icon only when its link is set", () => {
  it("renders NOTHING when no social link is set", () => {
    // Previously this fell back to the template's demo socials, publishing
    // three href="#" icons — including TikTok — on every un-configured site.
    expect(buildBusinessProfile(base, business()).footer.socials).toEqual([]);
  });

  it("renders only the platforms that have a link", () => {
    const profile = buildBusinessProfile(
      base,
      business({ instagramUrl: "https://instagram.com/ronies" }),
    );
    expect(profile.footer.socials).toEqual([
      {
        label: "IG",
        href: "https://instagram.com/ronies",
        ariaLabel: "Instagram",
      },
    ]);
  });

  it("keeps a stable FB · IG · TK order regardless of which are set", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        tiktokUrl: "https://tiktok.com/@ronies",
        facebookUrl: "https://facebook.com/ronies",
      }),
    );
    expect(profile.footer.socials.map((s) => s.label)).toEqual(["FB", "TK"]);
  });

  it("announces the platform name, not the monogram", () => {
    const profile = buildBusinessProfile(
      base,
      business({ tiktokUrl: "https://tiktok.com/@ronies" }),
    );
    // "TK" is a visual abbreviation; a screen reader must say "TikTok".
    expect(profile.footer.socials[0]!.ariaLabel).toBe("TikTok");
  });
});

describe("contact SOCIALS card", () => {
  it("lists the platforms that are set", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        facebookUrl: "https://facebook.com/r",
        tiktokUrl: "https://tiktok.com/@r",
        googleReviewUrl: "https://g.page/r",
      }),
    );
    const socials = profile.contact.details.find((d) => d.title === "SOCIALS");
    expect(socials?.lines[0]).toBe("Facebook · TikTok · Google");
  });

  it("omits the card entirely when nothing is set", () => {
    const profile = buildBusinessProfile(base, business());
    expect(
      profile.contact.details.find((d) => d.title === "SOCIALS"),
    ).toBeUndefined();
  });
});

describe("social URL validation — these become live hrefs", () => {
  it("accepts ordinary profile links", () => {
    const parsed = updateBusinessSchema.parse({
      facebookUrl: "https://facebook.com/ronies",
      instagramUrl: "http://instagram.com/ronies",
      tiktokUrl: "https://www.tiktok.com/@ronies",
    });
    expect(parsed.tiktokUrl).toBe("https://www.tiktok.com/@ronies");
  });

  it("REFUSES javascript: — zod's .url() alone would accept it", () => {
    // new URL("javascript:alert(1)") parses fine, so `.url()` is not a scheme
    // check. Without the explicit http(s) rule this is stored XSS.
    expect(() =>
      updateBusinessSchema.parse({ facebookUrl: "javascript:alert(1)" }),
    ).toThrow();
  });

  it("refuses data: and other non-web schemes", () => {
    for (const href of [
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
    ]) {
      expect(() => updateBusinessSchema.parse({ tiktokUrl: href })).toThrow();
    }
  });

  it("treats a cleared field as 'remove this icon', not an error", () => {
    const parsed = updateBusinessSchema.parse({ facebookUrl: "" });
    // `null`, NOT `undefined`. BusinessRepository.update writes only the fields
    // that are not undefined, so a blank that parsed to undefined would be
    // dropped on the floor — the form would report "saved" and the icon would
    // still be there. null is what actually clears the column.
    expect(parsed.facebookUrl).toBeNull();
  });

  it("leaves an omitted field alone rather than clearing it", () => {
    const parsed = updateBusinessSchema.parse({ facebookUrl: "" });
    expect("instagramUrl" in parsed).toBe(false);
  });
});
