"use server";

import { getOwnerContext } from "@/lib/tenant/business-context";
import { AnalyticsRepository } from "@/repositories/analytics-repository";
import { AnalyticsService, emptyAnalytics } from "@/services/analytics-service";
import type { AnalyticsData } from "@/types/analytics";

/**
 * Load the analytics view for the acting tenant. Real metrics come from the
 * tenant's own rows; visitors and Google reviews are sample data until those
 * integrations exist. Failures degrade to the empty view so the page renders.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return emptyAnalytics();

  const service = new AnalyticsService(new AnalyticsRepository(supabase));
  return service.getAnalytics(businessId);
}
