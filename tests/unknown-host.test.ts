import { describe, it, expect } from "vitest";
import { isPlatformHost } from "@/lib/tenant/resolve";

const ROOT = "platform.com";
const BASE = "https://platform.com";

describe("isPlatformHost — telling 'our page' from 'unknown domain'", () => {
  it("treats the apex and www as platform", () => {
    expect(isPlatformHost("platform.com", ROOT, BASE)).toBe(true);
    expect(isPlatformHost("www.platform.com", ROOT, BASE)).toBe(true);
  });

  it("treats the configured site host as platform (e.g. app.*)", () => {
    expect(
      isPlatformHost("app.platform.com", ROOT, "https://app.platform.com"),
    ).toBe(true);
  });

  it("always treats local dev hosts as platform", () => {
    expect(isPlatformHost("localhost", ROOT, BASE)).toBe(true);
    expect(isPlatformHost("127.0.0.1", ROOT, BASE)).toBe(true);
    expect(isPlatformHost("localhost:3000", ROOT, BASE)).toBe(true); // port stripped
    expect(isPlatformHost("", null, null)).toBe(true); // no host → don't 404
  });

  it("does NOT treat a customer domain as platform (so it can 404 if unmapped)", () => {
    expect(isPlatformHost("roniesbarber.com", ROOT, BASE)).toBe(false);
    expect(isPlatformHost("ronies.platform.com", ROOT, BASE)).toBe(false);
  });

  it("tolerates a malformed platform base URL", () => {
    expect(isPlatformHost("roniesbarber.com", ROOT, "not-a-url")).toBe(false);
    expect(isPlatformHost("platform.com", ROOT, "not-a-url")).toBe(true);
  });
});
