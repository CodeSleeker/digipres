import { z } from "zod";
import { createBusinessSchema } from "./business";
import type { OnboardingStepId } from "@/types/onboarding";

/**
 * Per-step validation for the onboarding wizard. Data steps are `.pick()`ed
 * from the business schema so the field rules stay in one place; the
 * verification step carries no data (it's an acknowledgment).
 */
export const stepSchemas = {
  info: createBusinessSchema.pick({ name: true, phone: true, email: true }),
  address: createBusinessSchema.pick({ address: true }),
  category: createBusinessSchema.pick({ category: true }),
  hours: createBusinessSchema.pick({ hours: true }),
  photos: createBusinessSchema.pick({ logoUrl: true, coverImageUrl: true }),
  description: createBusinessSchema.pick({ description: true }),
  verification: z.object({}),
  review: createBusinessSchema.pick({ googleReviewUrl: true }),
} satisfies Record<OnboardingStepId, z.ZodTypeAny>;

export type OnboardingStepData = {
  [K in OnboardingStepId]: z.infer<(typeof stepSchemas)[K]>;
};
