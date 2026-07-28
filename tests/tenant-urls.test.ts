import { describe, it, expect, afterEach, vi } from "vitest";
import { siteBaseUrl, tenantCanonicalUrl } from "@/lib/tenant/urls";

describe("tenant canonical URLs", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the subdomain as canonical when ROOT_DOMAIN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "example.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    expect(tenantCanonicalUrl("ronies")).toBe("https://ronies.example.com");
    expect(siteBaseUrl()).toBe("https://example.com");
  });

  it("uses the /s/<slug> path when ROOT_DOMAIN is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    expect(tenantCanonicalUrl("ronies")).toBe(
      "https://app.example.com/s/ronies",
    );
    // Trailing slash on SITE_URL is trimmed.
    expect(siteBaseUrl()).toBe("https://app.example.com");
  });

  it("lower-cases the slug", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "example.com");
    expect(tenantCanonicalUrl("RONIES")).toBe("https://ronies.example.com");
  });
});
