import { describe, it, expect } from "vitest";
import { buildRoutingTable } from "@/lib/domains/edge-config";
import { vercelDnsFor } from "@/lib/domains/provider";
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
  it("returns an A record for an apex domain", () => {
    expect(vercelDnsFor("roniesbarber.com")).toEqual([
      { type: "A", name: "@", value: "76.76.21.21" },
    ]);
  });

  it("returns a CNAME for a subdomain", () => {
    expect(vercelDnsFor("www.roniesbarber.com")).toEqual([
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
    ]);
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
