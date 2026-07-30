import { describe, it, expect } from "vitest";
import {
  generatedIconHref,
  iconInitial,
  tenantIcons,
} from "@/lib/tenant/icons";

/**
 * The tenant favicon chain. The property that matters most is the negative one:
 * a client's browser tab must never end up showing the PLATFORM's mark, no
 * matter which links of the chain are empty.
 */
describe("tenantIcons", () => {
  const initial = "R";

  it("prefers the dedicated favicon over the logo", () => {
    const icons = tenantIcons(
      { faviconUrl: "https://cdn.test/fav.png", logoUrl: "https://cdn.test/logo.png" },
      initial,
    );
    expect(JSON.stringify(icons)).toContain("fav.png");
    expect(JSON.stringify(icons)).not.toContain("logo.png");
  });

  it("falls back to the logo when no favicon is set", () => {
    const icons = tenantIcons(
      { faviconUrl: null, logoUrl: "https://cdn.test/logo.png" },
      initial,
    );
    expect(JSON.stringify(icons)).toContain("logo.png");
  });

  it("generates a tile from the initial when the tenant uploaded nothing", () => {
    const icons = tenantIcons({ faviconUrl: null, logoUrl: null }, initial);
    expect(JSON.stringify(icons)).toContain("/api/brand-icon?initial=R");
  });

  it("never falls back to the platform's own mark", () => {
    for (const business of [
      { faviconUrl: null, logoUrl: null },
      { faviconUrl: null, logoUrl: "https://cdn.test/logo.png" },
      { faviconUrl: "https://cdn.test/fav.png", logoUrl: null },
    ]) {
      expect(JSON.stringify(tenantIcons(business, initial))).not.toContain(
        "/brand/",
      );
    }
  });

  it("offers an apple-touch icon only for real uploads", () => {
    // iOS ignores SVG apple-touch-icons, so advertising the generated tile
    // there would produce a blank home-screen icon rather than a fallback.
    expect(
      tenantIcons({ faviconUrl: null, logoUrl: "https://cdn.test/l.png" }, "R"),
    ).toHaveProperty("apple");
    expect(
      tenantIcons({ faviconUrl: null, logoUrl: null }, "R"),
    ).not.toHaveProperty("apple");
  });
});

describe("iconInitial", () => {
  it("uppercases and keeps at most two characters", () => {
    expect(iconInitial("r")).toBe("R");
    expect(iconInitial("JR")).toBe("JR");
    expect(iconInitial("ABCD")).toBe("AB");
  });

  it("keeps non-Latin letters", () => {
    expect(iconInitial("Ω")).toBe("Ω");
    expect(iconInitial("日本")).toBe("日本");
  });

  it("is an allow-list, so SVG markup cannot survive it", () => {
    // The result is interpolated into an SVG document by app/api/brand-icon.
    // Nothing that could open a tag or an entity may come out the other side.
    for (const attack of [
      "<script>alert(1)</script>",
      "\"/><script>x</script>",
      "&#60;svg onload=alert(1)>",
    ]) {
      const out = iconInitial(attack);
      expect(out).not.toMatch(/[<>&"']/);
    }
  });

  it("falls back to a neutral mark rather than an empty tile", () => {
    expect(iconInitial("")).toBe("•");
    expect(iconInitial("   ")).toBe("•");
    expect(iconInitial("!!!")).toBe("•");
  });
});

describe("generatedIconHref", () => {
  it("encodes the initial into the query so the URL is content-addressed", () => {
    // A rename changes the URL, which is what makes the immutable cache header
    // on the route safe.
    expect(generatedIconHref("A")).not.toBe(generatedIconHref("B"));
    expect(generatedIconHref("Ω")).toBe(
      `/api/brand-icon?initial=${encodeURIComponent("Ω")}`,
    );
  });
});
