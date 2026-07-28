/**
 * Domain provisioning port. The platform must register each custom hostname
 * with the edge/CDN so it routes to this project and gets a certificate.
 *
 * Implemented today by the Vercel Domains API; the interface exists so a
 * Cloudflare-for-SaaS provider can replace it later without touching tenant
 * resolution (lib/tenant/*) or the data model.
 */

/** A DNS record the business owner must create at their registrar. */
export interface DnsInstruction {
  type: "A" | "CNAME" | "TXT";
  /** Record name — "@" for the apex, or the subdomain label. */
  name: string;
  value: string;
}

export interface DomainProvisionResult {
  ok: boolean;
  /** True once the edge confirms DNS points here and the cert is issued. */
  verified: boolean;
  instructions: DnsInstruction[];
  error?: string;
}

export interface DomainProvider {
  readonly name: string;
  /** Register the hostname with the edge (idempotent). */
  add(hostname: string): Promise<DomainProvisionResult>;
  /** Current verification state + outstanding DNS challenges. */
  status(hostname: string): Promise<DomainProvisionResult>;
  /** Ask the edge to re-check DNS now. */
  verify(hostname: string): Promise<DomainProvisionResult>;
  remove(hostname: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Best-effort DNS pointing record for Vercel.
 *
 * NOTE: apex detection is a 2-label heuristic — correct for `roniesbarber.com`
 * and `abcconstruction.ph`, but a multi-part TLD (`foo.co.uk`) would be treated
 * as a subdomain. The provider's own challenge records (returned by the API)
 * are authoritative; this is display guidance.
 */
export function vercelDnsFor(hostname: string): DnsInstruction[] {
  const labels = hostname.split(".");
  const isApex = labels.length === 2;
  return isApex
    ? [{ type: "A", name: "@", value: "76.76.21.21" }]
    : [{ type: "CNAME", name: labels[0]!, value: "cname.vercel-dns.com" }];
}

/** Used when no provisioning credentials are configured (e.g. local dev). */
export class UnconfiguredDomainProvider implements DomainProvider {
  readonly name = "unconfigured";

  private result(hostname: string): DomainProvisionResult {
    return {
      ok: false,
      verified: false,
      instructions: vercelDnsFor(hostname),
      error:
        "Domain provisioning is not configured (set VERCEL_API_TOKEN and VERCEL_PROJECT_ID).",
    };
  }

  async add(hostname: string) {
    return this.result(hostname);
  }
  async status(hostname: string) {
    return this.result(hostname);
  }
  async verify(hostname: string) {
    return this.result(hostname);
  }
  async remove() {
    return { ok: false, error: "Domain provisioning is not configured." };
  }
}
