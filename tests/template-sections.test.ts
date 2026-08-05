import { describe, it, expect } from "vitest";
import { TEMPLATES, templateSections } from "@/templates/registry";
import {
  SECTION_COLUMN,
  WEBSITE_SECTIONS,
  type WebsiteSection,
} from "@/types/website-content";
import { SECTION_SCHEMA } from "@/schemas/website-content";
import { buildBusinessProfile, toBarberEntry } from "@/lib/website/build-profile";
import type { BusinessProfile } from "@/types/business";
import type { Business } from "@/types/business-entity";

/**
 * A template declares which editable sections it renders; the CMS navigation,
 * the section route and the save action all derive from that list. These pin
 * the invariants that make the derivation safe.
 */

describe("templateSections", () => {
  it("gives the barber template its team and shop sections", () => {
    const sections = templateSections("barber-luxury");
    expect(sections).toContain("barbers");
    expect(sections).toContain("products");
  });

  it("falls back to the default template — matching loadTemplate", () => {
    // A bad template_code must not empty the CMS or 404 every section; it
    // renders the default site, so it must offer the default site's sections.
    expect(templateSections("does-not-exist")).toEqual(
      templateSections("barber-luxury"),
    );
    expect(templateSections(null)).toEqual(templateSections("barber-luxury"));
    expect(templateSections(undefined)).toEqual(
      templateSections("barber-luxury"),
    );
  });

  it("never declares a section the platform can't store or validate", () => {
    for (const template of TEMPLATES) {
      for (const section of template.sections) {
        expect(WEBSITE_SECTIONS).toContain(section);
        expect(SECTION_COLUMN[section]).toBeTruthy();
        expect(SECTION_SCHEMA[section]).toBeTruthy();
      }
    }
  });

  it("declares no duplicates", () => {
    for (const template of TEMPLATES) {
      expect(new Set(template.sections).size).toBe(template.sections.length);
    }
  });

  it("keeps every catalogue section storable and validatable", () => {
    for (const section of WEBSITE_SECTIONS) {
      expect(SECTION_COLUMN[section as WebsiteSection]).toBeTruthy();
      expect(SECTION_SCHEMA[section as WebsiteSection]).toBeTruthy();
    }
  });
});

// ── Barbers / products merge ────────────────────────────────────────────────

const base = {
  brand: { namePrimary: "R", nameAccent: "B", initial: "R" },
  seo: { title: "t", description: "d" },
  hero: {},
  about: {},
  services: {},
  barbers: {
    heading: { label: "The Team", title: "MEET OUR BARBERS" },
    items: [
      {
        name: "RONIE",
        role: "OWNER",
        bio: "b",
        image: "/r.jpg",
        socials: [{ label: "IG", href: "#", ariaLabel: "Instagram" }],
      },
    ],
  },
  gallery: {},
  products: {
    heading: { label: "Shop", title: "GROOMING ESSENTIALS" },
    items: [{ icon: "🧴", name: "POMADE", description: "d", price: "₱450" }],
  },
  // Required by the merge (nav filtering reads faq.items) even though these
  // tests are about barbers and products.
  nav: [],
  faq: { heading: { label: "l", title: "t" }, items: [] },
  contact: { details: [] },
  footer: { socials: [] },
} as unknown as BusinessProfile;

const business = (content: Partial<Business["content"]> = {}): Business =>
  ({
    name: "Ronies Barber",
    hours: [],
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      products: null,
      contact: null,
      footer: null,
      ...content,
    },
  }) as unknown as Business;

describe("buildBusinessProfile — barbers and products", () => {
  it("keeps the template default when nothing is stored", () => {
    const profile = buildBusinessProfile(base, business());
    expect(profile.barbers).toBe(base.barbers);
    expect(profile.products).toBe(base.products);
  });

  it("uses stored content when present", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        products: {
          heading: { label: "Shop", title: "OUR PRODUCTS" },
          items: [{ icon: "✨", name: "BALM", description: "d", price: "₱1" }],
        },
      }),
    );
    expect(profile.products.heading.title).toBe("OUR PRODUCTS");
  });

  it("derives a barber's social links from bare profile URLs", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        barbers: {
          heading: { label: "Team", title: "OUR TEAM" },
          items: [
            {
              name: "MARCO",
              role: "SENIOR BARBER",
              bio: "b",
              image: "/m.jpg",
              instagramUrl: "https://instagram.com/marco",
            },
          ],
        },
      }),
    );

    const [marco] = profile.barbers.items;
    expect(marco!.socials).toEqual([
      {
        label: "IG",
        href: "https://instagram.com/marco",
        // Named, not just "Instagram" — four identical "Instagram" links on one
        // page are indistinguishable to a screen reader.
        ariaLabel: "MARCO on Instagram",
      },
    ]);
  });

  it("omits a social link entirely when its URL is blank", () => {
    const profile = buildBusinessProfile(
      base,
      business({
        barbers: {
          heading: { label: "Team", title: "OUR TEAM" },
          items: [{ name: "JAY", role: "BARBER", bio: "", image: "/j.jpg" }],
        },
      }),
    );
    expect(profile.barbers.items[0]!.socials).toEqual([]);
  });
});

describe("toBarberEntry", () => {
  it("drops placeholder hrefs the owner could not save", () => {
    // Template defaults use href:"#", which the schema rejects — prefilling the
    // form with it would make an untouched form fail to save.
    const entry = toBarberEntry(base.barbers.items[0]!);
    expect(entry.instagramUrl).toBeUndefined();
    expect(entry.name).toBe("RONIE");
  });

  it("keeps a real https profile URL", () => {
    const entry = toBarberEntry({
      name: "MARCO",
      role: "R",
      bio: "b",
      image: "/m.jpg",
      socials: [
        { label: "FB", href: "https://facebook.com/marco", ariaLabel: "FB" },
      ],
    });
    expect(entry.facebookUrl).toBe("https://facebook.com/marco");
    expect(entry.instagramUrl).toBeUndefined();
  });
});
