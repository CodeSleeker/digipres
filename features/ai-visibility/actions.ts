"use server";

import { getOwnerContext } from "@/lib/tenant/business-context";
import { VisibilityService } from "@/services/visibility-service";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { loadTemplate } from "@/templates/registry";
import type { VisibilityReport } from "@/types/ai-visibility";

/**
 * Analyze the tenant's site/data and return the AI Visibility report:
 * an actionable checklist plus an AI Readiness Score. Recommendations only —
 * no ranking is promised.
 *
 * The RESOLVED profile is what the content checks are scored against — built
 * the same way app/s/[slug] builds it, so the report describes the page a
 * visitor and a crawler actually get. Scoring `business.content` instead
 * measured the database: an un-customized tenant was told they had no FAQ and
 * no described photographs while their live site published both, because those
 * come from the template default and the stored columns are still null.
 */
export async function getVisibilityReport(): Promise<VisibilityReport> {
  const { business } = await getOwnerContext();
  if (!business) return new VisibilityService().analyze(null);

  // A template that fails to load must not take the report down — the score is
  // then computed from stored content, which is the old behaviour rather than
  // an error page.
  let profile = null;
  try {
    const { defaultProfile } = await loadTemplate(business.templateCode);
    profile = buildBusinessProfile(defaultProfile, business);
  } catch (error) {
    console.error("[ai-visibility:profile]", error);
  }

  return new VisibilityService().analyze(business, profile);
}
