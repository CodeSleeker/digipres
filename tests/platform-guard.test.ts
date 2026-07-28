import { describe, it, expect, afterEach, vi } from "vitest";
import { platformRedirectUrl, resolveHostRoute } from "@/lib/tenant/resolve";
import { platformBaseUrl } from "@/lib/tenant/urls";
import type { TenantRouting } from "@/lib/tenant/edge-routing";

const ROOT = "platform.com";
const PLATFORM = "https://platform.com";

const routing: TenantRouting = {
  domains: { "roniesbarber.com": { slug: "ronies", primary: true } },
  primary: { ronies: "roniesbarber.com" },
};

const routeFor = (host: string) => resolveHostRoute(host, ROOT, routing);

describe("platform-path guard", () => {
  it("redirects /admin off a custom domain to the platform host", () => {
    expect(
      platformRedirectUrl(routeFor("roniesbarber.com"), PLATFORM, "/admin"),
    ).toBe("https://platform.com/admin");
  });

  it("redirects /login off a platform subdomain too", () => {
    expect(
      platformRedirectUrl(routeFor("ronies.platform.com"), PLATFORM, "/login"),
    ).toBe("https://platform.com/login");
  });

  it("preserves the path and query string", () => {
    expect(
      platformRedirectUrl(
        routeFor("roniesbarber.com"),
        PLATFORM,
        "/admin/customers",
        "?page=2",
      ),
    ).toBe("https://platform.com/admin/customers?page=2");
  });

  it("allows platform paths through on the platform host itself", () => {
    expect(platformRedirectUrl(routeFor("platform.com"), PLATFORM, "/admin")).toBeNull();
    // 'app' is a reserved subdomain → not a tenant → admin allowed there.
    expect(
      platformRedirectUrl(routeFor("app.platform.com"), PLATFORM, "/admin"),
    ).toBeNull();
  });

  it("never redirects when the platform host is unknown (local dev)", () => {
    expect(
      platformRedirectUrl(routeFor("roniesbarber.com"), null, "/admin"),
    ).toBeNull();
  });
});

describe("platformBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers NEXT_PUBLIC_SITE_URL and trims trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    expect(platformBaseUrl()).toBe("https://app.example.com");
  });

  it("falls back to the root domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", ROOT);
    expect(platformBaseUrl()).toBe("https://platform.com");
  });

  it("returns null when neither is set — so we never redirect to localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "");
    expect(platformBaseUrl()).toBeNull();
  });
});
