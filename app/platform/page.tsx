import Link from "next/link";
import { getPlatformStats } from "@/features/platform/queries";
import { StatTile } from "./_components/stat-tile";

/**
 * Platform overview: totals across every tenant, plus the queue signals that
 * indicate whether review automation is healthy.
 */
export default async function PlatformOverviewPage() {
  const stats = await getPlatformStats();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Totals across every business on the platform.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Businesses"
          value={stats.activeBusinesses}
          hint={
            stats.businesses > stats.activeBusinesses
              ? `${stats.businesses - stats.activeBusinesses} archived`
              : "All active"
          }
        />
        <StatTile label="Customers" value={stats.customers} hint="Across all tenants" />
        <StatTile
          label="Appointments"
          value={stats.appointments}
          hint="Across all tenants"
        />
        <StatTile
          label="Verified domains"
          value={stats.verifiedDomains}
          hint="Live custom domains"
        />
      </section>

      <div>
        <h2 className="mb-1 font-admin-heading text-lg tracking-[2px]">
          Review automation
        </h2>
        <p className="text-sm text-admin-muted">
          Queue health across the platform. A growing queue or rising failures
          means the scheduler or carrier needs attention.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Messages sent"
          value={stats.messagesSent}
          hint="Delivered to the carrier"
        />
        <StatTile
          label="Queued"
          value={stats.messagesQueued}
          tone={stats.messagesQueued > 0 ? "warn" : "default"}
          hint="Awaiting the scheduler"
        />
        <StatTile
          label="Failed"
          value={stats.messagesFailed}
          tone={stats.messagesFailed > 0 ? "danger" : "default"}
          hint="Exhausted all retries"
        />
      </section>

      <Link
        href="/platform/businesses"
        className="text-sm text-admin-accent transition-colors hover:text-admin-accent-hover"
      >
        View all businesses →
      </Link>
    </div>
  );
}
