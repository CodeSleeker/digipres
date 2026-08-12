import { describe, it, expect } from "vitest";
import {
  directionsUrl,
  isShortMapLink,
  isValidCoordinates,
  osmEmbedUrl,
  parseCoordinates,
} from "@/lib/geo/coordinates";
import { buildLocalBusinessJsonLd } from "@/lib/seo/json-ld";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { gloria } from "@/lib/businesses/gloria";
import type { Business } from "@/types/business-entity";

/**
 * The map pin.
 *
 * Nobody knows their own latitude, so the input that matters is a pasted Google
 * Maps link — every format below is one an owner can actually produce from the
 * app or the website.
 */

describe("parseCoordinates", () => {
  const cases: [string, string][] = [
    ["place URL", "https://www.google.com/maps/place/Gloria's/@8.1836,124.8619,17z/data=!3m1"],
    ["bare map URL", "https://www.google.com/maps/@8.1836,124.8619,15z"],
    ["q= link", "https://maps.google.com/?q=8.1836,124.8619"],
    ["ll= link", "https://www.google.com/maps?ll=8.1836,124.8619&z=15"],
    ["typed pair", "8.1836, 124.8619"],
    ["typed pair, no space", "8.1836,124.8619"],
  ];

  for (const [name, input] of cases) {
    it(`reads a ${name}`, () => {
      expect(parseCoordinates(input)).toEqual({
        latitude: 8.1836,
        longitude: 124.8619,
      });
    });
  }

  it("prefers the map centre over a search term in the same URL", () => {
    // A place URL carries both `@lat,lng` (where the map is) and often a `q=`
    // holding the search text. The centre is the one that means the place.
    const url =
      "https://www.google.com/maps/place/X/@8.1836,124.8619,17z?q=1.0,2.0";
    expect(parseCoordinates(url)).toEqual({
      latitude: 8.1836,
      longitude: 124.8619,
    });
  });

  it("handles a southern/western location", () => {
    expect(parseCoordinates("-33.8688, -151.2093")).toEqual({
      latitude: -33.8688,
      longitude: -151.2093,
    });
  });

  it("returns nothing for input with no coordinate in it", () => {
    for (const input of ["", "   ", "Dahilayan, Bukidnon", "https://example.com"]) {
      expect(parseCoordinates(input), input).toBeNull();
    }
  });

  it("refuses an out-of-range pair rather than storing a place that isn't", () => {
    // The mistyped-decimal case: 1240 instead of 124.0 would put the marker
    // nowhere and publish it as the business's location.
    expect(parseCoordinates("8.1836, 1240")).toBeNull();
    expect(parseCoordinates("91.0, 20.0")).toBeNull();
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
  });

  it("recognises a short link, which carries no coordinate at all", () => {
    // It is an opaque id only Google can expand — so the owner gets a specific
    // instruction rather than "we couldn't read that".
    expect(isShortMapLink("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isShortMapLink("https://goo.gl/maps/abc123")).toBe(true);
    expect(parseCoordinates("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(isShortMapLink("https://www.google.com/maps/@8.1,124.8,15z")).toBe(
      false,
    );
  });
});

describe("map URLs", () => {
  const point = { latitude: 8.1836, longitude: 124.8619 };

  it("frames the pin in the embed rather than centring on nothing", () => {
    const url = osmEmbedUrl(point);
    expect(url).toContain("marker=8.1836,124.8619");
    // The bbox brackets the point on both axes.
    const bbox = new URL(url).searchParams.get("bbox")!.split(",").map(Number);
    expect(bbox[0]).toBeLessThan(point.longitude);
    expect(bbox[2]).toBeGreaterThan(point.longitude);
    expect(bbox[1]).toBeLessThan(point.latitude);
    expect(bbox[3]).toBeGreaterThan(point.latitude);
  });

  it("opens directions TO the place, not a search for it", () => {
    // `dir/?api=1&destination=` starts routing from the visitor's own location;
    // a search would only drop a pin they then have to act on.
    expect(directionsUrl(point)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=8.1836,124.8619",
    );
  });
});

const business = (over: Partial<Business> = {}): Business =>
  ({
    slug: "tenant",
    name: "Tenant",
    category: "lodging",
    hours: [],
    address: null,
    addressLocality: null,
    phone: null,
    email: null,
    latitude: null,
    longitude: null,
    lodgingDetails: null,
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

describe("the pin reaching the page and the markup", () => {
  it("emits GeoCoordinates once the owner has set one", () => {
    const data = buildLocalBusinessJsonLd(
      business({ latitude: 8.1836, longitude: 124.8619 }),
      "https://example.com/",
    );
    expect(data.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 8.1836,
      longitude: 124.8619,
    });
  });

  it("emits no geo at all when there is no pin", () => {
    const data = buildLocalBusinessJsonLd(business(), "https://example.com/");
    expect(data).not.toHaveProperty("geo");
  });

  it("reaches the template as contact.geo, from the tenant's own columns", () => {
    const profile = buildBusinessProfile(
      gloria,
      business({ latitude: 1.5, longitude: 2.5 }),
    );
    expect(profile.contact.geo).toEqual({ latitude: 1.5, longitude: 2.5 });
  });

  /**
   * The template default must NOT leak its pin to a tenant who hasn't set one:
   * every un-configured site would otherwise show a map of somebody else's
   * property. Omitted rather than zeroed, because 0,0 is a real place in the
   * Atlantic and a truthiness check would happily render it.
   */
  it("does not fall back to the template's own pin", () => {
    expect(gloria.contact.geo).toBeTruthy();
    const profile = buildBusinessProfile(gloria, business());
    expect(profile.contact.geo).toBeUndefined();
  });
});
