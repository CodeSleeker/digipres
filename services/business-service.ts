import type { BusinessRepository } from "@/repositories/business-repository";
import type { Business } from "@/types/business-entity";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@/schemas/business";

export type BusinessErrorCode =
  | "ALREADY_EXISTS" // owner already has an active business
  | "SLUG_TAKEN" // slug in use by another active business
  | "NOT_FOUND" // owner has no active business
  | "INVALID_HOSTNAME" // custom domain isn't a valid hostname
  | "HOSTNAME_TAKEN"; // hostname already mapped to another business

export class BusinessError extends Error {
  constructor(public readonly code: BusinessErrorCode) {
    super(code);
    this.name = "BusinessError";
  }
}

/**
 * Business-rule layer for the Business entity. Owns the invariants:
 *  - one active business per owner,
 *  - globally-unique active slug.
 *
 * CREATE is owner-scoped — the "one per owner" invariant is inherently keyed on
 * the owner, and it only ever runs in a real owner's own session. Everything
 * else is BUSINESS-scoped (takes a `businessId`), like every other service, so
 * platform staff acting as a tenant operate the client's record, not their own.
 * See lib/tenant/business-context.ts for how the id is resolved.
 *
 * It orchestrates the repository and never touches Supabase or HTTP directly.
 */
export class BusinessService {
  constructor(private readonly repo: BusinessRepository) {}

  /** Public/tenant lookup by slug. */
  getBySlug(slug: string): Promise<Business | null> {
    return this.repo.findBySlug(slug);
  }

  getById(businessId: string): Promise<Business | null> {
    return this.repo.findById(businessId);
  }

  async createForOwner(
    ownerId: string,
    input: CreateBusinessInput,
  ): Promise<Business> {
    const existing = await this.repo.findByOwnerId(ownerId);
    if (existing) throw new BusinessError("ALREADY_EXISTS");

    if (await this.repo.slugExists(input.slug)) {
      throw new BusinessError("SLUG_TAKEN");
    }
    return this.repo.insert(ownerId, input);
  }

  async updateById(
    businessId: string,
    input: UpdateBusinessInput,
  ): Promise<Business> {
    const existing = await this.repo.findById(businessId);
    if (!existing) throw new BusinessError("NOT_FOUND");

    if (
      input.slug !== undefined &&
      input.slug !== existing.slug &&
      (await this.repo.slugExists(input.slug, existing.id))
    ) {
      throw new BusinessError("SLUG_TAKEN");
    }
    return this.repo.update(existing.id, input);
  }

  async deleteById(businessId: string): Promise<void> {
    const existing = await this.repo.findById(businessId);
    if (!existing) throw new BusinessError("NOT_FOUND");
    await this.repo.softDelete(existing.id);
  }
}
