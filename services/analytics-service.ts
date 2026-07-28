import type {
  AnalyticsRepository,
  AppointmentFact,
} from "@/repositories/analytics-repository";
import type { AnalyticsData, TimePoint } from "@/types/analytics";
import {
  bucketByMonth,
  bucketRangeStart,
  monthBuckets,
  type MonthBucket,
} from "@/lib/analytics/buckets";

const MONTHS = 6;

/**
 * Computes the admin Analytics view for ONE business (the caller supplies the
 * id): pulls the narrow source rows and aggregates them into chart-ready shapes.
 * Website visitors and Google reviews have no integration yet, so they return
 * clearly-flagged sample data.
 */
export class AnalyticsService {
  constructor(private readonly analytics: AnalyticsRepository) {}

  async getAnalytics(businessId: string): Promise<AnalyticsData> {
    const buckets = monthBuckets(MONTHS);
    const sinceIso = bucketRangeStart(MONTHS);

    const [appts, createdDates, reviewStatuses, smsStatuses] =
      await Promise.all([
        this.analytics.appointmentsSince(businessId, sinceIso),
        this.analytics.customerCreatedDatesSince(businessId, sinceIso),
        this.analytics.customerReviewStatuses(businessId),
        this.analytics.reviewMessageStatuses(businessId),
      ]);

    return {
      hasBusiness: true,
      months: MONTHS,
      appointments: aggregateAppointments(appts, buckets),
      reviewRate: aggregateReviewRate(reviewStatuses),
      repeatCustomers: aggregateRepeatCustomers(appts),
      smsDelivery: aggregateSmsDelivery(smsStatuses),
      monthlyGrowth: aggregateGrowth(createdDates, buckets),
      websiteVisitors: placeholderVisitors(buckets),
      googleReviews: placeholderGoogleReviews(),
    };
  }
}

/* --- Aggregation helpers -------------------------------------------------- */
/* Month bucketing is shared with the platform-wide analytics (lib/analytics). */

function aggregateAppointments(
  appts: AppointmentFact[],
  buckets: MonthBucket[],
): AnalyticsData["appointments"] {
  return {
    series: bucketByMonth(buckets, appts.map((a) => a.startsAt)),
    total: appts.length,
    completed: appts.filter((a) => a.status === "completed").length,
  };
}

function aggregateReviewRate(
  statuses: string[],
): AnalyticsData["reviewRate"] {
  const received = statuses.filter((s) => s === "received").length;
  const requested = statuses.filter((s) => s === "requested").length;
  const pending = statuses.filter((s) => s === "pending").length;
  const asked = received + requested;
  return {
    received,
    requested,
    pending,
    ratePct: asked ? Math.round((received / asked) * 100) : 0,
  };
}

function aggregateRepeatCustomers(
  appts: AppointmentFact[],
): AnalyticsData["repeatCustomers"] {
  const perCustomer = new Map<string, number>();
  for (const a of appts) {
    if (!a.customerId) continue;
    perCustomer.set(a.customerId, (perCustomer.get(a.customerId) ?? 0) + 1);
  }
  let repeat = 0;
  let oneTime = 0;
  for (const count of perCustomer.values()) {
    if (count >= 2) repeat += 1;
    else oneTime += 1;
  }
  const total = repeat + oneTime;
  return {
    repeat,
    oneTime,
    repeatPct: total ? Math.round((repeat / total) * 100) : 0,
  };
}

function aggregateSmsDelivery(
  statuses: string[],
): AnalyticsData["smsDelivery"] {
  const count = (s: string) => statuses.filter((x) => x === s).length;
  const delivered = count("delivered");
  const sent = count("sent");
  const queued = count("queued");
  const failed = count("failed");
  const cancelled = count("cancelled");
  const attempted = delivered + sent + failed;
  return {
    delivered,
    sent,
    queued,
    failed,
    cancelled,
    total: statuses.length,
    deliveryRatePct: attempted
      ? Math.round(((delivered + sent) / attempted) * 100)
      : 0,
  };
}

function aggregateGrowth(
  createdDates: string[],
  buckets: MonthBucket[],
): TimePoint[] {
  return bucketByMonth(buckets, createdDates);
}

/* --- Placeholders (no integration yet) ------------------------------------ */

function placeholderVisitors(
  buckets: MonthBucket[],
): AnalyticsData["websiteVisitors"] {
  // Deterministic gentle upward trend so the chart is stable across renders.
  const base = [180, 240, 300, 285, 360, 430];
  const series = buckets.map((b, i) => ({
    label: b.label,
    value: base[i] ?? base[base.length - 1],
  }));
  return {
    series,
    total: series.reduce((s, p) => s + p.value, 0),
    isPlaceholder: true,
  };
}

function placeholderGoogleReviews(): AnalyticsData["googleReviews"] {
  const distribution = [
    { stars: 5, value: 62 },
    { stars: 4, value: 21 },
    { stars: 3, value: 6 },
    { stars: 2, value: 2 },
    { stars: 1, value: 1 },
  ];
  const total = distribution.reduce((s, d) => s + d.value, 0);
  const weighted = distribution.reduce((s, d) => s + d.stars * d.value, 0);
  return {
    distribution,
    average: Math.round((weighted / total) * 10) / 10,
    total,
    isPlaceholder: true,
  };
}

/** Zeroed view, used when the owner has no business yet. */
export function emptyAnalytics(): AnalyticsData {
  const buckets = monthBuckets(MONTHS);
  const zeroSeries = buckets.map((b) => ({ label: b.label, value: 0 }));
  return {
    hasBusiness: false,
    months: MONTHS,
    appointments: { series: zeroSeries, total: 0, completed: 0 },
    reviewRate: { received: 0, requested: 0, pending: 0, ratePct: 0 },
    repeatCustomers: { repeat: 0, oneTime: 0, repeatPct: 0 },
    smsDelivery: {
      delivered: 0,
      sent: 0,
      queued: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
      deliveryRatePct: 0,
    },
    monthlyGrowth: zeroSeries,
    websiteVisitors: placeholderVisitors(buckets),
    googleReviews: placeholderGoogleReviews(),
  };
}
