import type { BusinessRepository } from "@/repositories/business-repository";
import type { Business } from "@/types/business-entity";
import type { WebsiteSection } from "@/types/website-content";

/**
 * Business-rule layer for the Website CMS, scoped to ONE business (the caller
 * supplies the id). Validation of the content payload happens at the action
 * boundary; this layer owns the write itself.
 */
export class WebsiteContentService {
  constructor(private readonly repo: BusinessRepository) {}

  updateSection(
    businessId: string,
    section: WebsiteSection,
    data: unknown,
  ): Promise<Business> {
    return this.repo.updateContent(businessId, section, data);
  }
}
