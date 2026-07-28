/** A single labelled point in a time series (e.g. one month). */
export interface TimePoint {
  label: string;
  value: number;
}

/**
 * Aggregated, owner-scoped analytics for the admin Analytics page. Real metrics
 * are computed from the tenant's own rows; `websiteVisitors` and `googleReviews`
 * are sample placeholders until those integrations are wired (flagged via the
 * `*IsPlaceholder` booleans so the UI can label them).
 */
export interface AnalyticsData {
  hasBusiness: boolean;
  /** How many months the time series span. */
  months: number;

  appointments: {
    series: TimePoint[];
    total: number;
    completed: number;
  };

  reviewRate: {
    received: number;
    requested: number;
    pending: number;
    /** received / (received + requested), 0–100. */
    ratePct: number;
  };

  repeatCustomers: {
    repeat: number;
    oneTime: number;
    /** repeat / (repeat + oneTime), 0–100. */
    repeatPct: number;
  };

  smsDelivery: {
    delivered: number;
    sent: number;
    queued: number;
    failed: number;
    cancelled: number;
    total: number;
    /** (delivered + sent) / (delivered + sent + failed), 0–100. */
    deliveryRatePct: number;
  };

  monthlyGrowth: TimePoint[];

  websiteVisitors: {
    series: TimePoint[];
    total: number;
    isPlaceholder: boolean;
  };

  googleReviews: {
    distribution: { stars: number; value: number }[];
    average: number;
    total: number;
    isPlaceholder: boolean;
  };
}
