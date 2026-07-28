import type { ReviewStatus } from "./customer";

/** A recent customer row for the dashboard's "Recent Customers" panel. */
export interface RecentCustomer {
  id: string;
  name: string;
  reviewStatus: ReviewStatus;
  /** ISO date (YYYY-MM-DD) or null. */
  lastVisit: string | null;
  /** ISO timestamp the record was created. */
  createdAt: string;
}

/**
 * Aggregated, owner-scoped metrics for the admin dashboard. Read-only counts;
 * no analytics (Google rating / website visitors) is computed here yet.
 */
export interface DashboardStats {
  hasBusiness: boolean;
  /** Non-cancelled appointments starting today. */
  todaysAppointments: number;
  /** Total active customers. */
  totalCustomers: number;
  /** Customers who were asked for a review but haven't left one (requested). */
  pendingReviews: number;
  /** Review-automation messages that reached the carrier (sent or delivered). */
  messagesSent: number;
  recentCustomers: RecentCustomer[];
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  hasBusiness: false,
  todaysAppointments: 0,
  totalCustomers: 0,
  pendingReviews: 0,
  messagesSent: 0,
  recentCustomers: [],
};
