/**
 * Google Business Profile onboarding wizard — a guided setup flow (NOT a Google
 * API integration). Progress is stored as { completedSteps } in the
 * businesses.google_onboarding column; the underlying data lives in the normal
 * businesses columns.
 */

export type OnboardingStepId =
  | "info"
  | "address"
  | "category"
  | "hours"
  | "photos"
  | "description"
  | "verification"
  | "review";

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  /** 1-based position shown in the UI. */
  index: number;
  title: string;
  blurb: string;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { id: "info", index: 1, title: "Business Information", blurb: "Name and contact details" },
  { id: "address", index: 2, title: "Business Address", blurb: "Where customers find you" },
  { id: "category", index: 3, title: "Business Category", blurb: "Your primary industry" },
  { id: "hours", index: 4, title: "Operating Hours", blurb: "When you're open" },
  { id: "photos", index: 5, title: "Upload Photos", blurb: "Logo and cover image" },
  { id: "description", index: 6, title: "Business Description", blurb: "Tell your story" },
  { id: "verification", index: 7, title: "Verification Guide", blurb: "How to verify with Google" },
  { id: "review", index: 8, title: "Google Review Link", blurb: "Paste your review URL" },
];

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = ONBOARDING_STEPS.map(
  (s) => s.id,
);

export interface OnboardingProgress {
  completedSteps: OnboardingStepId[];
}

export const EMPTY_ONBOARDING: OnboardingProgress = { completedSteps: [] };

/** Completion percentage (0–100), counting only valid, unique completed steps. */
export function onboardingPercentage(progress: OnboardingProgress): number {
  const valid = new Set(
    progress.completedSteps.filter((s) => ONBOARDING_STEP_IDS.includes(s)),
  );
  return Math.round((valid.size / ONBOARDING_STEPS.length) * 100);
}
