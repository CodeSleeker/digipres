import { describe, it, expect } from "vitest";
import { apexMode } from "@/lib/marketing/mode";

/**
 * The apex `/` must never show a tenant's site in production (no
 * DEV_BUSINESS_SLUG there) and must keep the dev preview when the slug is set.
 * Tenant routing itself (subdomains, /s/<slug>, custom domains) never reaches
 * this decision — covered by the host-routing tests.
 */
describe("apex mode", () => {
  it("serves the marketing landing page when no dev slug is set (production)", () => {
    expect(apexMode({})).toBe("landing");
    expect(apexMode({ DEV_BUSINESS_SLUG: undefined })).toBe("landing");
  });

  it("treats a blank or whitespace slug as unset — prod never previews a tenant", () => {
    expect(apexMode({ DEV_BUSINESS_SLUG: "" })).toBe("landing");
    expect(apexMode({ DEV_BUSINESS_SLUG: "   " })).toBe("landing");
  });

  it("keeps the tenant preview in local dev when the slug is set", () => {
    expect(apexMode({ DEV_BUSINESS_SLUG: "ronies" })).toBe("tenant");
  });

  it("ignores unrelated environment variables", () => {
    expect(apexMode({ NEXT_PUBLIC_ROOT_DOMAIN: "platform.com" })).toBe(
      "landing",
    );
  });
});
