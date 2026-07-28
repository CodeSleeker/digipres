"use server";

import { getOwnerContext } from "@/lib/tenant/business-context";
import { VisibilityService } from "@/services/visibility-service";
import type { VisibilityReport } from "@/types/ai-visibility";

/**
 * Analyze the tenant's site/data and return the AI Visibility report:
 * an actionable checklist plus an AI Readiness Score. Recommendations only —
 * no ranking is promised.
 */
export async function getVisibilityReport(): Promise<VisibilityReport> {
  const { business } = await getOwnerContext();
  return new VisibilityService().analyze(business);
}
