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
 * This project's own DNS target, e.g. `33165ec7eaa7cde9.vercel-dns-017.com`.
 *
 * Vercel is expanding its IP range and now recommends a CNAME to a
 * PROJECT-SPECIFIC hostname for the apex as well as for subdomains. The value
 * identifies the Vercel project, not the domain — every tenant hostname is
 * added to the same project, so one setting serves all of them. Read it from
 * the "View DNS configuration" panel on any domain in the Vercel dashboard.
 *
 * Unset ⇒ the legacy records below, which Vercel confirms will keep working.
 */
export function vercelDnsTarget(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  // A trailing dot is how the dashboard prints an FQDN; registrars don't want
  // it, and pasting it verbatim is the likeliest way to copy this wrong.
  return env.VERCEL_DNS_TARGET?.trim().replace(/\.$/, "") || undefined;
}

/**
 * Best-effort DNS pointing record for Vercel.
 *
 * With `VERCEL_DNS_TARGET` set this is a CNAME either way — that is Vercel's
 * current recommendation, and it is what stops every client's domain showing
 * "DNS Change Recommended" in the dashboard. An apex CNAME needs a registrar
 * that flattens (Cloudflare does, and is what this platform documents); the
 * legacy A record remains the fallback for one that doesn't, which is also what
 * you get when the target isn't configured.
 *
 * NOTE: apex detection is a 2-label heuristic — correct for `roniesbarber.com`
 * and `abcconstruction.ph`, but a multi-part TLD (`foo.co.uk`) would be treated
 * as a subdomain. The provider's own challenge records (returned by the API)
 * are authoritative; this is display guidance.
 */
export function vercelDnsFor(
  hostname: string,
  target: string | undefined = vercelDnsTarget(),
): DnsInstruction[] {
  const labels = hostname.split(".");
  const isApex = labels.length === 2;
  const name = isApex ? "@" : labels[0]!;

  if (target) return [{ type: "CNAME", name, value: target }];

  return isApex
    ? [{ type: "A", name, value: "76.76.21.21" }]
    : [{ type: "CNAME", name, value: "cname.vercel-dns.com" }];
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
