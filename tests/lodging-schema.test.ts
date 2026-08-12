import { describe, it, expect } from "vitest";
import { buildLocalBusinessJsonLd, CATEGORY_TYPE } from "@/lib/seo/json-ld";
import { lodgingDetailsSchema } from "@/schemas/business";
import type { Business } from "@/types/business-entity";
import type { LodgingDetails } from "@/types/business-entity";

/**
 * The structured facts a place to stay has.
 *
 * `category` already published a lodging tenant as schema.org LodgingBusiness,
 * but the markup carried only the generic fields — so an answer engine knew the
 * KIND of business and nothing about staying there. These pin the properties
 * that closed that gap, and the rule that governs all of them: an unanswered
 * question publishes nothing.
 */

const business = (over: Partial<Business> = {}): Business =>
  ({
    name: "Gloria's",
    category: "lodging",
    description: null,
    phone: null,
    email: null,
    address: null,
    addressLocality: null,
    addressRegion: null,
    addressPostalCode: null,
    addressCountry: null,
    logoUrl: null,
    coverImageUrl: null,
    hours: [],
    googleReviewUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    websiteUrl: null,
    lodgingDetails: null,
    ...over,
  }) as unknown as Business;

const jsonLd = (details: LodgingDetails | null) =>
  buildLocalBusinessJsonLd(
    business({ lodgingDetails: details }),
    "https://example.com/",
  );

describe("lodging structured data", () => {
  it("types the business as LodgingBusiness", () => {
    expect(CATEGORY_TYPE.lodging).toBe("LodgingBusiness");
    expect(jsonLd(null)["@type"]).toBe("LodgingBusiness");
  });

  it("publishes the facts a guest asks about before booking", () => {
    const data = jsonLd({
      checkInTime: "14:00",
      checkOutTime: "11:00",
      bedrooms: 3,
      maxGuests: 8,
      petsAllowed: true,
      amenities: ["Wifi", "Free parking"],
    });

    expect(data.checkinTime).toBe("14:00");
    expect(data.checkoutTime).toBe("11:00");
    expect(data.numberOfRooms).toBe(3);
    expect(data.petsAllowed).toBe(true);
  });

  it("models capacity as a QuantitativeValue, not a bare number", () => {
    // `occupancy: 8` is not valid schema.org and is quietly ignored by parsers
    // — the failure mode is silence, which is why it is pinned.
    expect(jsonLd({ maxGuests: 8 }).occupancy).toEqual({
      "@type": "QuantitativeValue",
      maxValue: 8,
      unitText: "guests",
    });
  });

  it("models amenities as LocationFeatureSpecification", () => {
    expect(jsonLd({ amenities: ["Wifi"] }).amenityFeature).toEqual([
      { "@type": "LocationFeatureSpecification", name: "Wifi", value: true },
    ]);
  });

  /**
   * The rule the whole feature turns on. Markup that misdescribes a business is
   * a structured-data policy violation, not a nitpick — so silence is the only
   * safe answer to a question nobody was asked.
   */
  it("says nothing about what the owner has not filled in", () => {
    const bare = jsonLd(null);
    for (const key of [
      "checkinTime",
      "checkoutTime",
      "numberOfRooms",
      "occupancy",
      "petsAllowed",
      "amenityFeature",
    ]) {
      expect(bare, key).not.toHaveProperty(key);
    }

    // And a partly filled document publishes only its filled parts.
    const partial = jsonLd({ checkInTime: "14:00" });
    expect(partial.checkinTime).toBe("14:00");
    expect(partial).not.toHaveProperty("petsAllowed");
    expect(partial).not.toHaveProperty("checkoutTime");
  });

  it("never publishes 'no pets' because the question went unanswered", () => {
    // A checkbox nobody ticked would arrive as false. The tri-state is what
    // keeps "not said" distinct from "no".
    expect(jsonLd({ bedrooms: 2 })).not.toHaveProperty("petsAllowed");
    expect(jsonLd({ petsAllowed: false }).petsAllowed).toBe(false);
  });

  it("leaves a non-lodging business untouched", () => {
    // The action refuses to write these for another category; this proves the
    // renderer would ignore them even if a row somehow carried them.
    const barber = buildLocalBusinessJsonLd(
      business({ category: "barber", lodgingDetails: null }),
      "https://example.com/",
    );
    expect(barber["@type"]).toBe("HairSalon");
    expect(barber).not.toHaveProperty("checkinTime");
  });
});

describe("lodging details schema", () => {
  const parse = (input: Record<string, unknown>) =>
    lodgingDetailsSchema.safeParse(input);

  it("accepts a completely empty form", () => {
    // An owner who knows none of this yet must still be able to save the rest.
    const result = parse({
      checkInTime: "",
      checkOutTime: "",
      bedrooms: "",
      maxGuests: "",
      petsAllowed: "",
      amenities: [""],
    });
    expect(result.success, JSON.stringify(result.error)).toBe(true);
    expect(result.success && result.data.amenities).toEqual([]);
  });

  it("refuses a time that isn't a real one", () => {
    // Some mobile keyboards hand over "25:00" or a seconds component; either
    // would be published as a check-in time.
    expect(parse({ checkInTime: "25:00" }).success).toBe(false);
    expect(parse({ checkInTime: "2pm" }).success).toBe(false);
    expect(parse({ checkInTime: "14:00" }).success).toBe(true);
  });

  it("drops blank amenity lines rather than storing empty features", () => {
    const result = parse({ amenities: ["Wifi", "  ", "", "Parking"] });
    expect(result.success && result.data.amenities).toEqual([
      "Wifi",
      "Parking",
    ]);
  });

  it("keeps 'not said' distinct from 'no' for pets", () => {
    expect(parse({ petsAllowed: "" }).success).toBe(true);
    const unanswered = parse({ petsAllowed: "" });
    expect(unanswered.success && unanswered.data.petsAllowed).toBeFalsy();

    const no = parse({ petsAllowed: "no" });
    expect(no.success && no.data.petsAllowed).toBe("no");
  });

  it("bounds the counts", () => {
    expect(parse({ bedrooms: "0" }).success).toBe(false);
    expect(parse({ maxGuests: "9999" }).success).toBe(false);
    expect(parse({ bedrooms: "3", maxGuests: "8" }).success).toBe(true);
  });
});
