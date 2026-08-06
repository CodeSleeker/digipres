import { getPlatformGrowth, getPlatformStats } from "@/features/platform/queries";
import { ChartCard, BarChart, LineChart } from "@/components/charts";
import { StatTile } from "../_components/stat-tile";

/** Growth and usage across every tenant on the platform. */
export default async function PlatformAnalyticsPage() {
  const [growth, stats] = await Promise.all([
    getPlatformGrowth(6),
    getPlatformStats(),
  ]);

  const thisMonth = (series: { value: number }[]) =>
    series.at(-1)?.value ?? 0;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          Platform Analytics
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Growth across all businesses over the last {growth.months} months.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="New businesses this month"
          value={thisMonth(growth.businesses)}
          hint={`${stats.activeBusinesses} active in total`}
        />
        <StatTile
          label="New customers this month"
          value={thisMonth(growth.customers)}
          hint={`${stats.customers} in total`}
        />
        <StatTile
          label="SMS sent this month"
          value={thisMonth(growth.messagesSent)}
          hint={`${stats.messagesSent} all time`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Businesses onboarded"
          subtitle="New tenants per month"
          badge={`${growth.months}M`}
        >
          <BarChart data={growth.businesses} />
        </ChartCard>

        <ChartCard
          title="Customer growth"
          subtitle="Customers added across all tenants"
          badge={`${growth.months}M`}
        >
          <LineChart data={growth.customers} id="platform-customers" />
        </ChartCard>

        <ChartCard
          title="SMS usage"
          subtitle="Messages sent per month — the basis for future quotas and billing"
          badge={`${growth.months}M`}
        >
          <BarChart data={growth.messagesSent} />
        </ChartCard>
      </div>
    </div>
  );
}
