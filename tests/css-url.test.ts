import { describe, it, expect } from "vitest";
import { isSafeImageUrl, imageLayer, backgroundImage } from "@/lib/security/css";

describe("isSafeImageUrl", () => {
  it("accepts http(s) and root-relative URLs", () => {
    expect(isSafeImageUrl("https://cdn.test/a.jpg")).toBe(true);
    expect(isSafeImageUrl("http://cdn.test/a.jpg?w=800&h=600")).toBe(true);
    expect(isSafeImageUrl("/images/hero.jpg")).toBe(true);
  });

  it("rejects CSS-breakout and non-http values", () => {
    // The core exploit: closing the url() and injecting CSS.
    expect(isSafeImageUrl("x');background:url(https://evil/x")).toBe(false);
    expect(isSafeImageUrl('a" )')).toBe(false);
    expect(isSafeImageUrl("https://cdn.test/a (1).jpg")).toBe(false); // paren
    expect(isSafeImageUrl("has space.jpg")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
  });
});

describe("imageLayer / backgroundImage", () => {
  it("wraps a safe URL and drops an unsafe one", () => {
    expect(imageLayer("https://cdn.test/a.jpg")).toBe(
      'url("https://cdn.test/a.jpg")',
    );
    expect(imageLayer("x');evil")).toBeNull();
  });

  it("composes valid layers and never emits a dangling comma", () => {
    expect(
      backgroundImage("linear-gradient(#000,#111)", imageLayer("https://cdn/a.jpg")),
    ).toBe('linear-gradient(#000,#111), url("https://cdn/a.jpg")');

    // Unsafe image → only the gradient remains (no trailing comma).
    expect(
      backgroundImage("linear-gradient(#000,#111)", imageLayer("x');evil")),
    ).toBe("linear-gradient(#000,#111)");

    // Nothing valid → "none".
    expect(backgroundImage(imageLayer("bad space.jpg"))).toBe("none");
  });
});
