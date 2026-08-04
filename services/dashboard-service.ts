import type { DashboardRepository } from "@/repositories/dashboard-repository";
import type { DashboardStats } from "@/types/dashboard";

const RECENT_CUSTOMERS_LIMIT = 6;

/**
 * Assembles the admin dashboard metrics for ONE business (the caller supplies
 * the id), fanning out the business-scoped count queries in parallel.
 */
export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async getStats(
    businessId: string,
    todayStartIso: string,
    todayEndIso: string,
  ): Promise<DashboardStats> {
    const [
      todaysAppointments,
      totalCustomers,
      pendingReviews,
      messagesSent,
      messagesQueued,
      recentCustomers,
    ] = await Promise.all([
      this.dashboard.countAppointmentsBetween(
        businessId,
        todayStartIso,
        todayEndIso,
      ),
      this.dashboard.countCustomers(businessId),
      this.dashboard.countCustomersByReviewStatus(businessId, "requested"),
      this.dashboard.countMessagesSent(businessId),
      this.dashboard.countMessagesQueued(businessId),
      this.dashboard.recentCustomers(businessId, RECENT_CUSTOMERS_LIMIT),
    ]);

    return {
      hasBusiness: true,
      todaysAppointments,
      totalCustomers,
      pendingReviews,
      messagesSent,
      messagesQueued,
      recentCustomers,
    };
  }
}
