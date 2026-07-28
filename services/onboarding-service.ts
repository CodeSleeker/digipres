import type { BusinessRepository } from "@/repositories/business-repository";
import type { Business } from "@/types/business-entity";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@/schemas/business";
import {
  onboardingPercentage,
  type OnboardingProgress,
  type OnboardingStepId,
} from "@/types/onboarding";
import { slugify } from "@/lib/slug";
import { BusinessError } from "./business-service";

export interface OnboardingState {
  business: Business | null;
  progress: OnboardingProgress;
  percentage: number;
}

/**
 * Rules for the Google Business Profile onboarding wizard.
 *
 * The wizard's data lives in the normal businesses columns; this service writes
 * those columns AND records which steps are complete. Step 1 ("info") creates
 * the business (auto-slug) if the owner has none yet; other data steps update
 * it; "verification" only records the acknowledgment.
 *
 * CREATE is owner-scoped (only a real owner in their own session onboards a new
 * business). Saving a step on an EXISTING business is business-scoped, so
 * platform staff acting as a tenant update the client's record, not their own.
 */
export class OnboardingService {
  constructor(private readonly repo: BusinessRepository) {}

  /** Flatten an already-resolved business into onboarding state (no lookup). */
  stateFromBusiness(business: Business | null): OnboardingState {
    const progress = business?.onboarding ?? { completedSteps: [] };
    return { business, progress, percentage: onboardingPercentage(progress) };
  }

  /**
   * Save a step against an EXISTING business (business-scoped). `info` and other
   * data steps update the columns; `verification` only records the ack.
   */
  async saveStepForBusiness(
    business: Business,
    stepId: OnboardingStepId,
    data: Record<string, unknown>,
  ): Promise<OnboardingState> {
    let current = business;
    if (stepId !== "verification") {
      current = await this.repo.update(
        business.id,
        data as UpdateBusinessInput,
      );
    }
    return this.recordProgress(current, stepId);
  }

  /**
   * Owner's FIRST step: create the business from the info step, then record it.
   * Only the `info` step may create; the others require the business to exist.
   */
  async createFromInfoStep(
    ownerId: string,
    stepId: OnboardingStepId,
    data: Record<string, unknown>,
  ): Promise<OnboardingState> {
    if (stepId !== "info") throw new BusinessError("NOT_FOUND");
    const business = await this.createFromInfo(ownerId, data);
    return this.recordProgress(business, stepId);
  }

  private async recordProgress(
    business: Business,
    stepId: OnboardingStepId,
  ): Promise<OnboardingState> {
    const completed = new Set<OnboardingStepId>(
      business.onboarding.completedSteps,
    );
    completed.add(stepId);
    const progress: OnboardingProgress = { completedSteps: [...completed] };

    const updated = await this.repo.updateOnboarding(business.id, progress);
    return {
      business: updated,
      progress,
      percentage: onboardingPercentage(progress),
    };
  }

  private async createFromInfo(
    ownerId: string,
    data: Record<string, unknown>,
  ): Promise<Business> {
    const name = String(data.name ?? "").trim();
    const input: CreateBusinessInput = {
      name,
      slug: await this.uniqueSlug(name),
      phone: (data.phone as string | undefined) ?? undefined,
      email: (data.email as string | undefined) ?? undefined,
      category: "other",
      hours: [],
    };
    return this.repo.insert(ownerId, input);
  }

  /** Generate a slug from the name, suffixing -2, -3, … until it's free. */
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "business";
    let candidate = base;
    let n = 2;
    while (await this.repo.slugExists(candidate)) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  }
}
