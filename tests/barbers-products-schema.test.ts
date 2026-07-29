import { describe, it, expect } from "vitest";
import { barbersSchema, productsSchema } from "@/schemas/website-content";

/**
 * These sections are owner-authored and render on the public site — a barber's
 * profile URL lands in an `<a href>`. The schema is the boundary; the template
 * renders whatever it is handed.
 */

const barber = {
  name: "MARCO",
  role: "SENIOR BARBER",
  bio: "Expert in modern styles.",
  image: "https://cdn.example.com/marco.jpg",
};

const heading = { label: "The Team", title: "MEET OUR BARBERS" };

describe("barbersSchema", () => {
  it("accepts a member with no socials at all", () => {
    const parsed = barbersSchema.parse({ heading, items: [barber] });
    expect(parsed.items[0]!.instagramUrl).toBeUndefined();
    expect(parsed.items[0]!.facebookUrl).toBeUndefined();
  });

  it("accepts https profile URLs", () => {
    const parsed = barbersSchema.parse({
      heading,
      items: [{ ...barber, instagramUrl: "https://instagram.com/marco" }],
    });
    expect(parsed.items[0]!.instagramUrl).toBe("https://instagram.com/marco");
  });

  it("REFUSES a javascript: URL — it would become a live href", () => {
    expect(() =>
      barbersSchema.parse({
        heading,
        items: [{ ...barber, instagramUrl: "javascript:alert(1)" }],
      }),
    ).toThrow();
  });

  it("refuses other dangerous or downgraded schemes", () => {
    for (const href of [
      "data:text/html,<script>",
      "http://instagram.com/marco",
      "//evil.example/marco",
      "https://ok.example/a b",
    ]) {
      expect(() =>
        barbersSchema.parse({
          heading,
          items: [{ ...barber, facebookUrl: href }],
        }),
      ).toThrow();
    }
  });

  it("normalises a cleared URL to undefined so no empty link renders", () => {
    const parsed = barbersSchema.parse({
      heading,
      items: [{ ...barber, instagramUrl: "  " }],
    });
    expect(parsed.items[0]!.instagramUrl).toBeUndefined();
  });

  it("requires a photo and at least one member", () => {
    expect(() =>
      barbersSchema.parse({ heading, items: [{ ...barber, image: "" }] }),
    ).toThrow();
    expect(() => barbersSchema.parse({ heading, items: [] })).toThrow();
  });
});

describe("productsSchema", () => {
  const product = {
    icon: "🧴",
    name: "MATTE CLAY POMADE",
    description: "Strong hold, natural finish",
    price: "₱450",
  };

  it("accepts a product without a ribbon", () => {
    const parsed = productsSchema.parse({
      heading: { label: "Shop", title: "GROOMING ESSENTIALS" },
      items: [product],
    });
    expect(parsed.items[0]!.tag).toBeUndefined();
  });

  it("normalises a blank ribbon away rather than rendering an empty badge", () => {
    const parsed = productsSchema.parse({
      heading: { label: "Shop", title: "GROOMING ESSENTIALS" },
      items: [{ ...product, tag: "   " }],
    });
    expect(parsed.items[0]!.tag).toBeUndefined();
  });

  it("keeps a real ribbon", () => {
    const parsed = productsSchema.parse({
      heading: { label: "Shop", title: "GROOMING ESSENTIALS" },
      items: [{ ...product, tag: "BEST SELLER" }],
    });
    expect(parsed.items[0]!.tag).toBe("BEST SELLER");
  });

  it("requires price and at least one product", () => {
    expect(() =>
      productsSchema.parse({
        heading: { label: "Shop", title: "S" },
        items: [{ ...product, price: "" }],
      }),
    ).toThrow();
    expect(() =>
      productsSchema.parse({
        heading: { label: "Shop", title: "S" },
        items: [],
      }),
    ).toThrow();
  });
});
