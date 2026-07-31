"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BusinessCategory, BusinessHours } from "@/types/business-entity";
import { ONBOARDING_STEP_IDS, type OnboardingStepId } from "@/types/onboarding";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { auditTenantAction } from "@/lib/audit/tenant-audit";
import { BusinessRepository } from "@/repositories/business-repository";
import { revalidateTenantSite } from "@/lib/tenant/revalidate";
import { OnboardingService } from "@/services/onboarding-service";
import { BusinessError } from "@/services/business-service";
import { stepSchemas } from "@/schemas/onboarding";

/** Flattened, client-safe snapshot the wizard and dashboard card render from. */
export interface OnboardingView {
  hasBusiness: boolean;
  fields: {
    name: string;
    phone: string;
    email: string;
    address: string;
    addressLocality: string;
    addressRegion: string;
    addressPostalCode: string;
    addressCountry: string;
    category: BusinessCategory;
    hours: BusinessHours;
    logoUrl: string;
    coverImageUrl: string;
    description: string;
    googleReviewUrl: string;
  };
  completedSteps: OnboardingStepId[];
  percentage: number;
}

export type OnboardingSaveResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  completedSteps?: OnboardingStepId[];
  percentage?: number;
};

function makeService(supabase: SupabaseClient<Database>): OnboardingService {
  return new OnboardingService(new BusinessRepository(supabase));
}

export async function getOnboardingView(): Promise<OnboardingView> {
  const { supabase, business: acting } = await getOwnerContext();
  // Built from the already-resolved acting tenant (the client's under
  // impersonation), not a re-lookup by owner id.
  const { business, progress, percentage } =
    makeService(supabase).stateFromBusiness(acting);

  return {
    hasBusiness: Boolean(business),
    fields: {
      name: business?.name ?? "",
      phone: business?.phone ?? "",
      email: business?.email ?? "",
      address: business?.address ?? "",
      addressLocality: business?.addressLocality ?? "",
      addressRegion: business?.addressRegion ?? "",
      addressPostalCode: business?.addressPostalCode ?? "",
      addressCountry: business?.addressCountry ?? "",
      category: business?.category ?? "other",
      hours: business?.hours ?? [],
      logoUrl: business?.logoUrl ?? "",
      coverImageUrl: business?.coverImageUrl ?? "",
      description: business?.description ?? "",
      googleReviewUrl: business?.googleReviewUrl ?? "",
    },
    completedSteps: progress.completedSteps,
    percentage,
  };
}

export async function saveOnboardingStep(
  formData: FormData,
): Promise<OnboardingSaveResult> {
  const context = await getOwnerContext();
  const { supabase, user, business } = context;

  const step = String(formData.get("step") ?? "");
  if (!ONBOARDING_STEP_IDS.includes(step as OnboardingStepId)) {
    return { error: "Unknown step." };
  }
  const stepId = step as OnboardingStepId;

  const rawContent = formData.get("content");
  let content: unknown;
  try {
    content = typeof rawContent === "string" ? JSON.parse(rawContent) : {};
  } catch {
    return { error: "Could not read the submitted data." };
  }

  const parsed = stepSchemas[stepId].safeParse(content);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (messages && messages.length) fieldErrors[key] = messages;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const service = makeService(supabase);
  const data = parsed.data as Record<string, unknown>;

  try {
    // Existing business → business-scoped update (the only path under
    // impersonation, since the client always exists). No business yet → the
    // owner's first step creates it; that never runs while impersonating.
    const state = business
      ? await service.saveStepForBusiness(business, stepId, data)
      : await service.createFromInfoStep(user.id, stepId, data);

    await auditTenantAction(context, "onboarding.step_saved", {
      entity: "business",
      entityId: state.business?.id ?? null,
      metadata: { step: stepId },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/onboarding");
    // Business fields feed the public site — revalidate the acting tenant's.
    // Use the post-save slug so a just-created business is purged too.
    revalidateTenantSite(state.business?.slug ?? null);
    return {
      success: true,
      completedSteps: state.progress.completedSteps,
      percentage: state.percentage,
    };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

function toMessage(error: unknown): string {
  if (error instanceof BusinessError && error.code === "NOT_FOUND") {
    return "Start with Business Information to create your profile.";
  }
  console.error("[onboarding]", error);
  return "Something went wrong. Please try again.";
}
