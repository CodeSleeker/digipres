"use server";

import { getOwnerContext } from "@/lib/tenant/business-context";
import { DashboardRepository } from "@/repositories/dashboard-repository";
import { DashboardService } from "@/services/dashboard-service";
import {
  EMPTY_DASHBOARD_STATS,
  type DashboardStats,
} from "@/types/dashboard";

/**
 * Load the owner-scoped dashboard metrics. "Today" is computed from the
 * server's local day boundaries. Failures degrade to zeroed stats so the
 * dashboard always renders.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) return EMPTY_DASHBOARD_STATS;

  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  const service = new DashboardService(new DashboardRepository(supabase));

  try {
    return await service.getStats(
      businessId,
      start.toISOString(),
      end.toISOString(),
    );
  } catch (error) {
    console.error("[dashboard]", error);
    return EMPTY_DASHBOARD_STATS;
  }
}
