import { describe, it, expect } from "vitest";
import {
  formatAddress,
  formatLocality,
  postalAddress,
} from "@/lib/businesses/address";
import { updateBusinessSchema } from "@/schemas/business";

const full = {
  address: "12 Corrales Ave",
  addressLocality: "Cagayan de Oro",
  addressRegion: "Misamis Oriental",
  addressPostalCode: "9000",
  addressCountry: "PH",
};

const empty = {
  address: null,
  addressLocality: null,
  addressRegion: null,
  addressPostalCode: null,
  addressCountry: null,
};

describe("formatAddress", () => {
  it("joins the parts into one readable line", () => {
    expect(formatAddress(full)).toBe(
      "12 Corrales Ave, Cagayan de Oro, Misamis Oriental, 9000",
    );
  });

  it("leaves the country code OUT of the printed line", () => {
    // "PH" exists for schema.org. On a local barber's contact card it reads
    // like a form field, not an address.
    expect(formatAddress(full)).not.toContain("PH");
  });

  it("skips missing parts without leaving stray commas", () => {
    expect(
      formatAddress({ ...empty, address: "12 Corrales Ave", addressLocality: "Cagayan de Oro" }),
    ).toBe("12 Corrales Ave, Cagayan de Oro");
    expect(formatAddress({ ...empty, addressLocality: "Cagayan de Oro" })).toBe(
      "Cagayan de Oro",
    );
  });

  it("returns null when there is nothing to show", () => {
    expect(formatAddress(empty)).toBeNull();
    expect(formatAddress({ ...empty, address: "   " })).toBeNull();
  });

  it("still renders a pre-migration row that has everything in one field", () => {
    // Rows created before 0027 hold the whole address in `address`. No backfill
    // was attempted, so this has to keep working untouched.
    expect(
      formatAddress({ ...empty, address: "12 Corrales Ave, Cagayan de Oro" }),
    ).toBe("12 Corrales Ave, Cagayan de Oro");
  });
});

describe("postalAddress", () => {
  it("emits every present component under its schema.org name", () => {
    expect(postalAddress(full)).toEqual({
      "@type": "PostalAddress",
      streetAddress: "12 Corrales Ave",
      addressLocality: "Cagayan de Oro",
      addressRegion: "Misamis Oriental",
      postalCode: "9000",
      addressCountry: "PH",
    });
  });

  it("omits blank components rather than asserting an empty place", () => {
    // `addressLocality: ""` is worse than absent — it claims the business is
    // in a place with no name.
    const node = postalAddress({ ...empty, address: "12 Corrales Ave", addressLocality: "  " });
    expect(node).toEqual({
      "@type": "PostalAddress",
      streetAddress: "12 Corrales Ave",
    });
  });

  it("returns null when every component is blank", () => {
    // The caller then omits `address` entirely rather than emitting a bare
    // @type, which would be a claim with no content.
    expect(postalAddress(empty)).toBeNull();
  });
});

describe("address validation", () => {
  it("upper-cases and accepts a 2-letter country code", () => {
    expect(
      updateBusinessSchema.parse({ addressCountry: "ph" }).addressCountry,
    ).toBe("PH");
  });

  it("refuses a country NAME, which is the weaker form", () => {
    expect(
      updateBusinessSchema.safeParse({ addressCountry: "Philippines" }).success,
    ).toBe(false);
  });

  it("clears each component when submitted blank", () => {
    const parsed = updateBusinessSchema.parse({
      addressLocality: "",
      addressRegion: "  ",
      addressPostalCode: "",
      addressCountry: "",
    });
    expect(parsed.addressLocality).toBeNull();
    expect(parsed.addressRegion).toBeNull();
    expect(parsed.addressPostalCode).toBeNull();
    expect(parsed.addressCountry).toBeNull();
  });

  it("leaves omitted components untouched", () => {
    const parsed = updateBusinessSchema.parse({ addressLocality: "Cebu" });
    expect("address" in parsed).toBe(false);
    expect("addressRegion" in parsed).toBe(false);
  });
});

describe("formatLocality", () => {
  it("gives the place without the street line", () => {
    // The share card asks "where is this business", not "how do I reach the
    // door" — and a home-based tenant should not have their street address
    // pasted into every group chat their link lands in.
    expect(formatLocality(full)).toBe("Cagayan de Oro, Misamis Oriental");
  });

  it("drops whichever half is missing", () => {
    expect(formatLocality({ ...empty, addressLocality: "Iligan" })).toBe(
      "Iligan",
    );
    expect(formatLocality({ ...empty, addressRegion: "Lanao del Norte" })).toBe(
      "Lanao del Norte",
    );
  });

  it("is null when there is no place, rather than guessing", () => {
    expect(formatLocality(empty)).toBeNull();
    expect(
      formatLocality({ ...empty, addressLocality: "   ", addressRegion: "" }),
    ).toBeNull();
  });

  it("does NOT fall back to the pre-0027 free-text address", () => {
    // Legacy rows keep a whole address in `address`. Falling back would put the
    // street line straight back into the card this helper exists to keep it out
    // of, and nothing downstream would flag it.
    expect(
      formatLocality({ ...empty, address: "12 Corrales Ave, Cagayan de Oro" }),
    ).toBeNull();
  });

  it("ignores postcode and country, which formatAddress includes", () => {
    const line = formatLocality(full)!;
    expect(line).not.toContain("9000");
    expect(line).not.toContain("PH");
  });
});
