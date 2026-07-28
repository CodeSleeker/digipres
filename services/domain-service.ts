import type { DomainRepository } from "@/repositories/domain-repository";
import { isValidHostname, normalizeHostname } from "@/repositories/domain-repository";
import type { DomainProvider, DnsInstruction } from "@/lib/domains/provider";
import type { BusinessDomain } from "@/types/domain";
import { BusinessError } from "./business-service";

/**
 * Privileged operations the owner-scoped client may not perform.
 *
 * `verified` is deliberately NOT owner-writable (migration 0010 revokes the
 * column), so flipping it runs through a service-role adapter. Publishing the
 * edge routing table is likewise a trusted write.
 */
export interface DomainAdminPort {
  markVerified(domainId: string): Promise<void>;
  /** Republish hostname → tenant routing to the edge. Returns false if unconfigured. */
  publishRouting(): Promise<boolean>;
}

export interface DomainSetupResult {
  domain: BusinessDomain;
  instructions: DnsInstruction[];
  /** Present when the edge provider couldn't be reached/configured. */
  providerError?: string;
}

export interface DomainVerifyResult {
  verified: boolean;
  instructions: DnsInstruction[];
  error?: string;
}

/**
 * Custom-domain rules for a tenant. Owner-scoped reads/writes go through the
 * injected repository (RLS applies); provisioning and verification go through
 * the provider + admin ports.
 */
export class DomainService {
  constructor(
    private readonly domains: DomainRepository,
    private readonly provider: DomainProvider,
    private readonly admin: DomainAdminPort,
  ) {}

  list(businessId: string): Promise<BusinessDomain[]> {
    return this.domains.listForBusiness(businessId);
  }

  /**
   * Add a hostname: record it (always unverified), then register it with the
   * edge provider. Provisioning failure is non-fatal — the row remains so the
   * owner can retry verification once DNS is set.
   */
  async add(
    businessId: string,
    rawHostname: string,
  ): Promise<DomainSetupResult> {
    const hostname = normalizeHostname(rawHostname);
    if (!isValidHostname(hostname)) {
      throw new BusinessError("INVALID_HOSTNAME");
    }

    const domain = await this.domains.insert(businessId, hostname);
    const result = await this.provider.add(hostname);

    return {
      domain,
      instructions: result.instructions,
      providerError: result.ok ? undefined : result.error,
    };
  }

  /**
   * Re-check DNS with the provider. On success, flip `verified` (service-role)
   * and republish the edge routing table so the domain starts serving.
   */
  async verify(businessId: string, id: string): Promise<DomainVerifyResult> {
    const domain = await this.domains.findById(businessId, id);
    if (!domain) throw new BusinessError("NOT_FOUND");

    const result = await this.provider.verify(domain.hostname);
    if (!result.verified) {
      return {
        verified: false,
        instructions: result.instructions,
        error: result.error,
      };
    }

    await this.admin.markVerified(domain.id);
    await this.admin.publishRouting();
    return { verified: true, instructions: [] };
  }

  /** Choose the canonical hostname; aliases then 301 to it. */
  async setPrimary(businessId: string, id: string): Promise<void> {
    const domain = await this.domains.findById(businessId, id);
    if (!domain) throw new BusinessError("NOT_FOUND");

    await this.domains.setPrimary(businessId, id);
    await this.admin.publishRouting();
  }

  /** Remove a hostname from the tenant and deregister it at the edge. */
  async remove(businessId: string, id: string): Promise<void> {
    const domain = await this.domains.findById(businessId, id);
    if (!domain) throw new BusinessError("NOT_FOUND");

    await this.domains.remove(businessId, id);
    await this.provider.remove(domain.hostname); // best effort
    await this.admin.publishRouting();
  }
}
