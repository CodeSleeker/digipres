import { describe, it, expect } from "vitest";
import { buildRoutingTable } from "@/lib/domains/edge-config";
import { vercelDnsFor, vercelDnsTarget } from "@/lib/domains/provider";
import { isValidHostname } from "@/repositories/domain-repository";
import type { DomainRoute } from "@/types/domain";

describe("buildRoutingTable", () => {
  const routes: DomainRoute[] = [
    { hostname: "roniesbarber.com", slug: "ronies", isPrimary: true },
    { hostname: "www.roniesbarber.com", slug: "ronies", isPrimary: false },
    { hostname: "abcconstruction.ph", slug: "abc", isPrimary: true },
  ];

  it("maps every verified hostname to its tenant", () => {
    const { domains } = buildRoutingTable(routes);
    expect(domains["roniesbarber.com"]).toEqual({
      slug: "ronies",
      primary: true,
    });
    expect(domains["www.roniesbarber.com"]).toEqual({
      slug: "ronies",
      primary: false,
    });
    expect(Object.keys(domains)).toHaveLength(3);
  });

  it("records one canonical hostname per tenant (aliases 301 to it)", () => {
    const { primary } = buildRoutingTable(routes);
    expect(primary).toEqual({
      ronies: "roniesbarber.com",
      abc: "abcconstruction.ph",
    });
  });

  it("is empty when nothing is verified", () => {
    expect(buildRoutingTable([])).toEqual({ domains: {}, primary: {} });
  });
});

describe("vercelDnsFor", () => {
  describe("without a project target (legacy records)", () => {
    it("returns an A record for an apex domain", () => {
      expect(vercelDnsFor("roniesbarber.com", undefined)).toEqual([
        { type: "A", name: "@", value: "76.76.21.21" },
      ]);
    });

    it("returns a CNAME for a subdomain", () => {
      expect(vercelDnsFor("www.roniesbarber.com", undefined)).toEqual([
        { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
      ]);
    });
  });

  describe("with a project target (Vercel's current recommendation)", () => {
    const target = "33165ec7eaa7cde9.vercel-dns-017.com";

    it("uses a CNAME at the apex, not an A record", () => {
      expect(vercelDnsFor("roniesbarber.com", target)).toEqual([
        { type: "CNAME", name: "@", value: target },
      ]);
    });

    it("uses the same target for a subdomain", () => {
      expect(vercelDnsFor("www.roniesbarber.com", target)).toEqual([
        { type: "CNAME", name: "www", value: target },
      ]);
    });
  });
});

describe("vercelDnsTarget", () => {
  it("is undefined when unset or blank", () => {
    expect(vercelDnsTarget({})).toBeUndefined();
    expect(vercelDnsTarget({ VERCEL_DNS_TARGET: "   " })).toBeUndefined();
  });

  it("strips the trailing dot the dashboard prints", () => {
    expect(
      vercelDnsTarget({
        VERCEL_DNS_TARGET: "33165ec7eaa7cde9.vercel-dns-017.com.",
      }),
    ).toBe("33165ec7eaa7cde9.vercel-dns-017.com");
  });
});

describe("isValidHostname (mirrors the DB CHECK)", () => {
  it("accepts real hostnames", () => {
    expect(isValidHostname("roniesbarber.com")).toBe(true);
    expect(isValidHostname("www.abcconstruction.ph")).toBe(true);
    expect(isValidHostname("my-shop.example.co.uk")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isValidHostname("no-tld")).toBe(false);
    expect(isValidHostname("HTTP://bad.com")).toBe(false);
    expect(isValidHostname("has space.com")).toBe(false);
    expect(isValidHostname("-leading.com")).toBe(false);
    expect(isValidHostname("")).toBe(false);
  });
});
