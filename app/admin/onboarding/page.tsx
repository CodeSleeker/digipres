import { getOnboardingView } from "@/features/onboarding/actions";
import { OnboardingWizard } from "./_components/onboarding-wizard";

/**
 * Google Business Profile onboarding wizard page. A guided setup checklist —
 * not a Google API integration. Progress is saved per step and stays editable.
 */
export default async function OnboardingPage() {
  const view = await getOnboardingView();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          Google Business Profile Setup
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          A guided checklist to get your business ready on Google. Your progress
          saves as you go and every step stays editable.
        </p>
      </div>
      <OnboardingWizard view={view} />
    </div>
  );
}
