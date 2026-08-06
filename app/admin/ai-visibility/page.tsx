import { getVisibilityReport } from "@/features/ai-visibility/actions";
import { ReadinessScore } from "./_components/readiness";
import { Checklist } from "./_components/checklist";

/**
 * AI Visibility: an optimization assistant that analyzes the site and generates
 * recommendations across an SEO / AI-readiness checklist, with an AI Readiness
 * Score. Advisory only — it never promises AI or search ranking.
 */
export default async function AiVisibilityPage() {
  const report = await getVisibilityReport();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">AI Visibility</h1>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          An optimization assistant that reviews how discoverable and
          machine-readable your website is for search engines and AI assistants.
          {!report.hasBusiness &&
            " Create your business profile to run a full analysis."}
        </p>
      </div>

      <ReadinessScore report={report} />

      <div>
        <h2 className="mb-1 font-admin-heading text-lg tracking-[2px]">
          Recommendations
        </h2>
        <p className="text-sm text-admin-muted">
          Prioritized, actionable checks. Address the red “Action” items first,
          then the amber “Improve” items.
        </p>
      </div>

      <Checklist checks={report.checks} />

      <p className="border-t border-admin-line pt-4 text-xs text-admin-muted">
        These recommendations aim to improve technical SEO and AI readability.
        They do not guarantee any AI answer inclusion, search position, or
        ranking outcome.
      </p>
    </div>
  );
}
