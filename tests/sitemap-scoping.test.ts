import { describe, it, expect } from "vitest";
import { buildSitemapUrls } from "@/lib/tenant/sitemap";
import type { HostContext } from "@/lib/tenant/request-host";

const SITE = "https://platform.com";
const platformUrlFor = (slug: string) => `https://${slug}.platform.com`;

const tenants = [
  { slug: "ronies", updatedAt: "2026-01-01T00:00:00.000Z" }, // has own domain
  { slug: "acme", updatedAt: "2026-01-02T00:00:00.000Z" }, // platform subdomain
];
const onOwnDomain = new Set(["ronies"]);

const tenantHost = (hostname: string, slug: string): HostContext => ({
  hostname,
  slug,
  isPlatformHost: false,
});
const platformHost: HostContext = {
  hostname: "platform.com",
  slug: null,
  isPlatformHost: true,
};

describe("sitemap scoping (the cross-customer leak fix)", () => {
  it("a custom domain lists ONLY its own site", () => {
    const urls = buildSitemapUrls({
      host: tenantHost("roniesbarber.com", "ronies"),
      siteUrl: SITE,
      tenants,
      onOwnDomain,
      platformUrlFor,
    });
    expect(urls.map((u) => u.url)).toEqual(["https://roniesbarber.com"]);
  });

  it("a platform subdomain lists ONLY its own site", () => {
    const urls = buildSitemapUrls({
      host: tenantHost("acme.platform.com", "acme"),
      siteUrl: SITE,
      tenants,
      onOwnDomain,
      platformUrlFor,
    });
    expect(urls.map((u) => u.url)).toEqual(["https://acme.platform.com"]);
  });

  it("never leaks another customer's domain onto a tenant host", () => {
    const urls = buildSitemapUrls({
      host: tenantHost("roniesbarber.com", "ronies"),
      siteUrl: SITE,
      tenants,
      onOwnDomain,
      platformUrlFor,
    });
    expect(urls.some((u) => u.url.includes("acme"))).toBe(false);
    expect(urls).toHaveLength(1);
  });

  it("the platform apex lists itself plus only subdomain-hosted tenants", () => {
    const urls = buildSitemapUrls({
      host: platformHost,
      siteUrl: SITE,
      tenants,
      onOwnDomain,
      platformUrlFor,
    });
    // 'ronies' lives on its own domain → excluded (it publishes its own sitemap).
    expect(urls.map((u) => u.url)).toEqual([
      SITE,
      "https://acme.platform.com",
    ]);
  });

  it("the apex degrades to itself when there are no tenants", () => {
    const urls = buildSitemapUrls({
      host: platformHost,
      siteUrl: SITE,
      tenants: [],
      onOwnDomain: new Set(),
      platformUrlFor,
    });
    expect(urls.map((u) => u.url)).toEqual([SITE]);
  });
});
