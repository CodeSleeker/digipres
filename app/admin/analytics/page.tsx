import { guardPage } from "@/lib/features/guard";
import { getAnalytics } from "@/features/analytics/actions";
import {
  ChartCard,
  BarChart,
  LineChart,
  DonutChart,
  StarBars,
  CHART,
} from "@/components/charts";

/**
 * Admin Analytics: seven charts. Appointments, Review Rate, Repeat Customers,
 * SMS Delivery and Monthly Growth are computed from the tenant's own data;
 * Website Visitors and Google Reviews show sample data until those integrations
 * are connected (labelled "Sample data").
 */
export default async function AnalyticsPage() {
  await guardPage("analytics");
  const a = await getAnalytics();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-heading text-2xl tracking-[2px]">Analytics</h1>
        <p className="mt-1 text-sm text-gray">
          Trends over the last {a.months} months.
          {!a.hasBusiness &&
            " Create your business profile to start collecting data."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Appointments"
          subtitle={`${a.appointments.total} booked · ${a.appointments.completed} completed`}
          badge={`${a.months}M`}
        >
          <BarChart data={a.appointments.series} />
        </ChartCard>

        <ChartCard
          title="Monthly Growth"
          subtitle="New customers added each month"
          badge={`${a.months}M`}
        >
          <LineChart data={a.monthlyGrowth} id="growth" />
        </ChartCard>

        <ChartCard
          title="Review Rate"
          subtitle="Of customers asked, how many reviewed"
        >
          <DonutChart
            centerValue={`${a.reviewRate.ratePct}%`}
            centerLabel="reviewed"
            segments={[
              {
                label: "Received",
                value: a.reviewRate.received,
                color: CHART.success,
              },
              {
                label: "Requested",
                value: a.reviewRate.requested,
                color: CHART.gold,
              },
              {
                label: "Not asked",
                value: a.reviewRate.pending,
                color: CHART.muted,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Repeat Customers"
          subtitle="Customers with more than one appointment"
        >
          <DonutChart
            centerValue={`${a.repeatCustomers.repeatPct}%`}
            centerLabel="repeat"
            segments={[
              {
                label: "Repeat",
                value: a.repeatCustomers.repeat,
                color: CHART.gold,
              },
              {
                label: "One-time",
                value: a.repeatCustomers.oneTime,
                color: CHART.muted,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="SMS Delivery"
          subtitle={`${a.smsDelivery.total} messages · ${a.smsDelivery.deliveryRatePct}% delivered`}
        >
          <DonutChart
            centerValue={`${a.smsDelivery.deliveryRatePct}%`}
            centerLabel="delivered"
            segments={[
              {
                label: "Delivered",
                value: a.smsDelivery.delivered,
                color: CHART.success,
              },
              { label: "Sent", value: a.smsDelivery.sent, color: CHART.gold },
              {
                label: "Queued",
                value: a.smsDelivery.queued,
                color: CHART.warning,
              },
              {
                label: "Failed",
                value: a.smsDelivery.failed,
                color: CHART.danger,
              },
              {
                label: "Cancelled",
                value: a.smsDelivery.cancelled,
                color: CHART.muted,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Website Visitors"
          subtitle={`${a.websiteVisitors.total.toLocaleString()} visits`}
          badge="Sample data"
        >
          <LineChart
            data={a.websiteVisitors.series}
            id="visitors"
            color={CHART.gray}
            dashed
          />
          <p className="mt-3 text-[0.7rem] text-gray">
            Connect a web-analytics provider to replace this with live traffic.
          </p>
        </ChartCard>

        <ChartCard
          title="Google Reviews"
          subtitle={`${a.googleReviews.average}★ average · ${a.googleReviews.total} reviews`}
          badge="Sample data"
        >
          <StarBars rows={a.googleReviews.distribution} />
          <p className="mt-4 text-[0.7rem] text-gray">
            Connect the Google Business Profile API to replace this with real
            ratings.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
