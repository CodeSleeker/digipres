import { describe, it, expect } from "vitest";
import { deriveBrand, resolveBrand } from "@/lib/website/build-profile";
import {
  loadTemplate,
  isValidTemplate,
  isValidTheme,
} from "@/templates/registry";
import type { BusinessProfile } from "@/types/business";
import type { Business } from "@/types/business-entity";

const base = {
  brand: {
    namePrimary: "RONIE'S",
    nameAccent: "BARBER",
    initial: "R",
    logoUrl: null,
  },
} as unknown as BusinessProfile;

const business = (over: Partial<Business> = {}): Business =>
  ({
    name: "Acme Construction",
    brand: null,
    logoUrl: null,
    ...over,
  }) as unknown as Business;

describe("deriveBrand", () => {
  it("splits a multi-word name into primary + accent", () => {
    expect(deriveBrand("Ronies Barber")).toEqual({
      namePrimary: "RONIES",
      nameAccent: "BARBER",
      initial: "R",
    });
  });

  it("keeps all but the last word as the primary", () => {
    expect(deriveBrand("ABC Construction Co")).toEqual({
      namePrimary: "ABC CONSTRUCTION",
      nameAccent: "CO",
      initial: "A",
    });
  });

  it("handles a single-word name", () => {
    expect(deriveBrand("Ronies")).toEqual({
      namePrimary: "RONIES",
      nameAccent: "",
      initial: "R",
    });
  });

  it("returns null for an empty name", () => {
    expect(deriveBrand("   ")).toBeNull();
  });
});

describe("resolveBrand", () => {
  it("prefers an explicit override", () => {
    const result = resolveBrand(
      base,
      business({
        brand: { namePrimary: "THE", nameAccent: "SHOP", initial: "T" },
      }),
    );
    expect(result).toEqual({
      namePrimary: "THE",
      nameAccent: "SHOP",
      initial: "T",
      logoUrl: null,
      wordmarkUrl: null,
    });
  });

  it("derives from the business name — so a second tenant is NOT branded as the first", () => {
    const result = resolveBrand(base, business({ name: "Acme Construction" }));
    expect(result).toMatchObject({
      namePrimary: "ACME",
      nameAccent: "CONSTRUCTION",
      initial: "A",
    });
    expect(result.namePrimary).not.toBe("RONIE'S"); // the template's demo brand
  });

  it("falls back to the template default when the name is unusable", () => {
    // toMatchObject, not toEqual: the resolved brand now also carries the
    // upload fields, which the template default fixture does not declare.
    expect(resolveBrand(base, business({ name: "" }))).toMatchObject(
      base.brand,
    );
  });

  it("backfills a missing initial from the primary", () => {
    const result = resolveBrand(
      base,
      business({
        brand: { namePrimary: "ZED", nameAccent: "", initial: "" },
      }),
    );
    expect(result.initial).toBe("Z");
  });

  it("carries the uploaded logo through, whatever the wordmark resolved to", () => {
    const logoUrl = "https://cdn.test/ronies.png";
    expect(resolveBrand(base, business({ logoUrl })).logoUrl).toBe(logoUrl);
    expect(
      resolveBrand(
        base,
        business({
          logoUrl,
          brand: { namePrimary: "THE", nameAccent: "SHOP", initial: "T" },
        }),
      ).logoUrl,
    ).toBe(logoUrl);
  });

  it("does not inherit the template default's logo slot", () => {
    // The demo profile ships logoUrl: null; a tenant with no upload must get
    // null too — never a stale image from whatever the base happened to hold.
    const withDemoLogo = {
      brand: { ...base.brand, logoUrl: "https://cdn.test/demo.png" },
    } as unknown as BusinessProfile;
    expect(resolveBrand(withDemoLogo, business({ name: "" })).logoUrl).toBeNull();
  });
});

// These dynamically import a whole template (every section + next/image), so
// first-load transform cost can exceed the 5s default when the full suite is
// transforming in parallel. The assertions are about resolution, not speed.
const TEMPLATE_LOAD_TIMEOUT_MS = 30_000;

describe("template registry", () => {
  it(
    "resolves the barber template",
    async () => {
      const template = await loadTemplate("barber-luxury");
      expect(template.code).toBe("barber-luxury");
      expect(template.Component).toBeTypeOf("function");
      expect(template.defaultProfile.brand.namePrimary).toBeTruthy();
    },
    TEMPLATE_LOAD_TIMEOUT_MS,
  );

  it(
    "falls back for an unknown or missing code rather than throwing",
    async () => {
      await expect(loadTemplate("does-not-exist")).resolves.toMatchObject({
        code: "barber-luxury",
      });
      await expect(loadTemplate(null)).resolves.toMatchObject({
        code: "barber-luxury",
      });
    },
    TEMPLATE_LOAD_TIMEOUT_MS,
  );

  it("validates template/theme pairs", () => {
    expect(isValidTemplate("barber-luxury")).toBe(true);
    expect(isValidTemplate("nope")).toBe(false);
    expect(isValidTheme("barber-luxury", "default")).toBe(true);
    expect(isValidTheme("barber-luxury", "neon")).toBe(false);
  });
});

describe("wordmark image (migration 0030)", () => {
  it("carries wordmarkUrl through to the rendering contract", () => {
    expect(
      resolveBrand(base, business({ wordmarkUrl: "https://cdn/wm.png" })),
    ).toMatchObject({ wordmarkUrl: "https://cdn/wm.png" });
  });

  it("is null when nothing is uploaded, not undefined", () => {
    // The template branches on truthiness; `undefined` would still work, but a
    // profile field that is sometimes absent is how optional chaining creeps in.
    expect(resolveBrand(base, business()).wordmarkUrl).toBeNull();
  });

  it("is independent of the logo mark, so all four combinations resolve", () => {
    const cases = [
      { logoUrl: null, wordmarkUrl: null },
      { logoUrl: "https://cdn/mark.png", wordmarkUrl: null },
      { logoUrl: null, wordmarkUrl: "https://cdn/wm.png" },
      { logoUrl: "https://cdn/mark.png", wordmarkUrl: "https://cdn/wm.png" },
    ];
    for (const c of cases) {
      const brand = resolveBrand(base, business(c));
      expect(brand.logoUrl).toBe(c.logoUrl);
      expect(brand.wordmarkUrl).toBe(c.wordmarkUrl);
      // The words survive in every combination — they are what the template
      // falls back to, and what feeds the wordmark image's alt text.
      expect(brand.namePrimary).toBeTruthy();
    }
  });

  it("keeps the words even when the name is shown as an image", () => {
    // The template builds the image's alt from these; losing them here would
    // leave the business name nowhere in the accessible tree.
    const brand = resolveBrand(
      base,
      business({ name: "Acme Construction", wordmarkUrl: "https://cdn/wm.png" }),
    );
    expect(`${brand.namePrimary} ${brand.nameAccent}`.trim()).toBe(
      "ACME CONSTRUCTION",
    );
  });
});
