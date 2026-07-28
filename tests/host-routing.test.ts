import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveHostRoute } from "@/lib/tenant/resolve";
import { canonicalUrlFor } from "@/lib/tenant/urls";
import type { TenantRouting } from "@/lib/tenant/edge-routing";

const ROOT = "platform.com";

// ronies has a custom domain (apex primary + www alias); acme has none.
const routing: TenantRouting = {
  domains: {
    "roniesbarber.com": { slug: "ronies", primary: true },
    "www.roniesbarber.com": { slug: "ronies", primary: false },
  },
  primary: { ronies: "roniesbarber.com" },
};

describe("resolveHostRoute — all four entry points map to one tenant", () => {
  it("resolves a custom apex domain (data-driven)", () => {
    const r = resolveHostRoute("roniesbarber.com", ROOT, routing);
    expect(r).toMatchObject({
      slug: "ronies",
      source: "domain",
      primaryHostname: "roniesbarber.com",
    });
  });

  it("resolves www to the same tenant, flagged as an alias", () => {
    const r = resolveHostRoute("www.roniesbarber.com", ROOT, routing);
    expect(r?.slug).toBe("ronies");
    // Not the canonical host → caller 301s to the apex.
    expect(r?.primaryHostname).toBe("roniesbarber.com");
    expect(r?.hostname).not.toBe(r?.primaryHostname);
  });

  it("resolves a platform subdomain when the tenant has no custom domain", () => {
    const r = resolveHostRoute("acme.platform.com", ROOT, routing);
    expect(r).toMatchObject({
      slug: "acme",
      source: "subdomain",
      primaryHostname: null, // nothing to redirect to → renders
    });
  });

  it("redirects the platform subdomain once a custom domain is primary", () => {
    const r = resolveHostRoute("ronies.platform.com", ROOT, routing);
    expect(r?.slug).toBe("ronies");
    expect(r?.primaryHostname).toBe("roniesbarber.com"); // → 301
  });

  it("ignores port and case, and returns null for apex/localhost/unknown", () => {
    expect(resolveHostRoute("RoniesBarber.com:443", ROOT, routing)?.slug).toBe(
      "ronies",
    );
    expect(resolveHostRoute("platform.com", ROOT, routing)).toBeNull();
    expect(resolveHostRoute("localhost", ROOT, routing)).toBeNull();
    expect(resolveHostRoute("unknown-domain.io", ROOT, routing)).toBeNull();
  });

  it("still resolves platform subdomains with no routing table (local dev)", () => {
    const r = resolveHostRoute("acme.platform.com", ROOT, null);
    expect(r).toMatchObject({ slug: "acme", primaryHostname: null });
  });
});

describe("canonicalUrlFor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers the verified primary domain", () => {
    expect(canonicalUrlFor("ronies", "roniesbarber.com")).toBe(
      "https://roniesbarber.com",
    );
  });

  it("falls back to the platform subdomain", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", ROOT);
    expect(canonicalUrlFor("ronies", null)).toBe("https://ronies.platform.com");
  });

  it("falls back to the /s/<slug> path when no root domain is set", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    expect(canonicalUrlFor("ronies", null)).toBe(
      "https://app.example.com/s/ronies",
    );
  });
});
