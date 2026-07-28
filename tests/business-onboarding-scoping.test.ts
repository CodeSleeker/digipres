import { describe, it, expect, vi } from "vitest";
import { BusinessService, BusinessError } from "@/services/business-service";
import { OnboardingService } from "@/services/onboarding-service";
import type { BusinessRepository } from "@/repositories/business-repository";
import type { Business } from "@/types/business-entity";

/**
 * Business scoping for the two services P2 originally left owner-scoped.
 *
 * Since impersonation runs owner-facing code on the service-role client (RLS
 * out of the picture), an update that resolved the tenant by *owner* would act
 * on the wrong business. These assert both services now act by the businessId
 * they are given, and that create stays a separate, owner-keyed path.
 */

const A = "biz-A";
const B = "biz-B";

const business = (over: Partial<Business> = {}): Business =>
  ({
    id: A,
    ownerId: "owner-A",
    name: "A Co",
    slug: "a-co",
    onboarding: { completedSteps: [] },
    ...over,
  }) as Business;

describe("BusinessService — business-scoped mutations", () => {
  it("updates by the given businessId and never re-resolves by owner", async () => {
    const repo = {
      findById: vi.fn(async () => business()),
      findByOwnerId: vi.fn(async () => business()),
      slugExists: vi.fn(async () => false),
      update: vi.fn(async () => business({ name: "New" })),
    };
    await new BusinessService(repo as unknown as BusinessRepository).updateById(
      A,
      { name: "New" },
    );

    expect(repo.findById).toHaveBeenCalledWith(A);
    expect(repo.update).toHaveBeenCalledWith(A, { name: "New" });
    // Owner resolution must play no part — that was the impersonation bug.
    expect(repo.findByOwnerId).not.toHaveBeenCalled();
  });

  it("refuses to update a business that doesn't exist (wrong id reads as absent)", async () => {
    const repo = {
      findById: vi.fn(async () => null),
      update: vi.fn(),
    };
    await expect(
      new BusinessService(repo as unknown as BusinessRepository).updateById(B, {
        name: "hijack",
      }),
    ).rejects.toBeInstanceOf(BusinessError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("checks slug uniqueness excluding the business being edited", async () => {
    const repo = {
      findById: vi.fn(async () => business({ slug: "old" })),
      slugExists: vi.fn(async () => false),
      update: vi.fn(async () => business()),
    };
    await new BusinessService(repo as unknown as BusinessRepository).updateById(
      A,
      { slug: "new" },
    );
    expect(repo.slugExists).toHaveBeenCalledWith("new", A);
  });

  it("deletes by the given businessId", async () => {
    const repo = {
      findById: vi.fn(async () => business()),
      softDelete: vi.fn(async () => undefined),
    };
    await new BusinessService(repo as unknown as BusinessRepository).deleteById(
      A,
    );
    expect(repo.softDelete).toHaveBeenCalledWith(A);
  });

  it("keeps create owner-keyed and enforces one-per-owner", async () => {
    const repo = {
      findByOwnerId: vi.fn(async () => business()), // already has one
      insert: vi.fn(),
    };
    await expect(
      new BusinessService(repo as unknown as BusinessRepository).createForOwner(
        "owner-A",
        { name: "X", slug: "x", category: "other", hours: [] } as never,
      ),
    ).rejects.toBeInstanceOf(BusinessError);
    expect(repo.insert).not.toHaveBeenCalled();
  });
});

describe("OnboardingService — saving a step on an existing business", () => {
  it("updates and records progress against the given business, not an owner", async () => {
    const repo = {
      findByOwnerId: vi.fn(),
      update: vi.fn(async () => business({ name: "Updated" })),
      updateOnboarding: vi.fn(async () =>
        business({ onboarding: { completedSteps: ["info"] } }),
      ),
    };
    const service = new OnboardingService(
      repo as unknown as BusinessRepository,
    );

    await service.saveStepForBusiness(business(), "info", { name: "Updated" });

    expect(repo.update).toHaveBeenCalledWith(A, { name: "Updated" });
    expect(repo.updateOnboarding).toHaveBeenCalledWith(A, {
      completedSteps: ["info"],
    });
    expect(repo.findByOwnerId).not.toHaveBeenCalled();
  });

  it("records the verification step WITHOUT touching the business columns", async () => {
    const repo = {
      update: vi.fn(),
      updateOnboarding: vi.fn(async () =>
        business({ onboarding: { completedSteps: ["verification"] } }),
      ),
    };
    const service = new OnboardingService(
      repo as unknown as BusinessRepository,
    );

    await service.saveStepForBusiness(business(), "verification", {});
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.updateOnboarding).toHaveBeenCalledWith(A, {
      completedSteps: ["verification"],
    });
  });

  it("refuses to create from a non-info first step", async () => {
    const repo = { insert: vi.fn() };
    const service = new OnboardingService(
      repo as unknown as BusinessRepository,
    );
    await expect(
      service.createFromInfoStep("owner-A", "photos", {}),
    ).rejects.toBeInstanceOf(BusinessError);
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it("stateFromBusiness derives progress without any lookup", () => {
    const repo = { findByOwnerId: vi.fn() };
    const service = new OnboardingService(
      repo as unknown as BusinessRepository,
    );

    const state = service.stateFromBusiness(
      business({ onboarding: { completedSteps: ["info"] } }),
    );
    expect(state.progress.completedSteps).toEqual(["info"]);
    expect(state.percentage).toBeGreaterThan(0);
    expect(repo.findByOwnerId).not.toHaveBeenCalled();
  });

  it("stateFromBusiness handles no business yet", () => {
    const service = new OnboardingService({} as unknown as BusinessRepository);
    const state = service.stateFromBusiness(null);
    expect(state.business).toBeNull();
    expect(state.progress.completedSteps).toEqual([]);
    expect(state.percentage).toBe(0);
  });
});
