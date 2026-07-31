import { describe, it, expect } from "vitest";
import { buildLocalBusinessJsonLd } from "@/lib/seo/json-ld";
import type { Business } from "@/types/business-entity";

function business(over: Partial<Business> = {}): Business {
  return {
    name: "Ronie's Barber",
    description: "Best cuts in town",
    phone: "+639171234567",
    email: "hi@ronies.test",
    address: "123 Main St, Cebu",
    logoUrl: "https://cdn.test/logo.png",
    coverImageUrl: "https://cdn.test/cover.jpg",
    category: "barber",
    facebookUrl: "https://facebook.com/ronies",
    instagramUrl: null,
    websiteUrl: "https://ronies.test",
    hours: [
      { day: 1, closed: false, open: "09:00", close: "18:00" },
      { day: 0, closed: true, open: null, close: null },
    ],
    ...over,
  } as unknown as Business;
}

const URL = "https://ronies.example.com";

describe("buildLocalBusinessJsonLd", () => {
  it("maps category to a schema.org subtype and sets core fields", () => {
    const ld = buildLocalBusinessJsonLd(business(), URL);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("HairSalon");
    expect(ld.name).toBe("Ronie's Barber");
    expect(ld.url).toBe(URL);
    expect(ld.telephone).toBe("+639171234567");
    expect(ld.image).toBe("https://cdn.test/cover.jpg");
  });

  it("nests the address as a PostalAddress", () => {
    const ld = buildLocalBusinessJsonLd(business(), URL);
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "123 Main St, Cebu",
    });
  });

  it("emits the full PostalAddress when the components are filled in", () => {
    // `addressLocality` is the point of the exercise: without it nothing on the
    // page says which town this is, and a parser answering "barber in Cagayan
    // de Oro" has to guess it out of prose.
    const ld = buildLocalBusinessJsonLd(
      business({
        address: "12 Corrales Ave",
        addressLocality: "Cagayan de Oro",
        addressRegion: "Misamis Oriental",
        addressPostalCode: "9000",
        addressCountry: "PH",
      }),
      URL,
    );
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "12 Corrales Ave",
      addressLocality: "Cagayan de Oro",
      addressRegion: "Misamis Oriental",
      postalCode: "9000",
      addressCountry: "PH",
    });
  });

  it("includes only present social links in sameAs", () => {
    const ld = buildLocalBusinessJsonLd(business(), URL);
    expect(ld.sameAs).toEqual([
      "https://facebook.com/ronies",
      "https://ronies.test",
    ]);
  });

  it("publishes the Google link FIRST in sameAs when there is one", () => {
    // This is the link that ties the website to the Business Profile — the
    // entity that actually answers "near me" searches. It was being collected
    // in onboarding and then never emitted.
    const ld = buildLocalBusinessJsonLd(
      business({ googleReviewUrl: "https://g.page/r/ronies/review" }),
      URL,
    );
    expect(ld.sameAs).toEqual([
      "https://g.page/r/ronies/review",
      "https://facebook.com/ronies",
      "https://ronies.test",
    ]);
  });

  it("omits sameAs entirely when the tenant has no links at all", () => {
    const ld = buildLocalBusinessJsonLd(
      business({
        googleReviewUrl: null,
        facebookUrl: null,
        websiteUrl: null,
      }),
      URL,
    );
    expect(ld.sameAs).toBeUndefined();
  });

  it("emits opening hours only for open days", () => {
    const ld = buildLocalBusinessJsonLd(business(), URL);
    expect(ld.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "18:00",
      },
    ]);
  });

  it("falls back to LocalBusiness for the 'other' category and omits absent fields", () => {
    const ld = buildLocalBusinessJsonLd(
      business({
        category: "other",
        address: null,
        phone: null,
        facebookUrl: null,
        instagramUrl: null,
        websiteUrl: null,
      }),
      URL,
    );
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.address).toBeUndefined();
    expect(ld.telephone).toBeUndefined();
    expect(ld.sameAs).toBeUndefined();
  });
});
