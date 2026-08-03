import Link from "next/link";
import { getMyBusiness } from "@/features/business/actions";
import { getOnboardingView } from "@/features/onboarding/actions";
import { getDashboardStats } from "@/features/dashboard/actions";
import { templateSections } from "@/templates/registry";
import {
  StatCard,
  CalendarIcon,
  UsersIcon,
  ReviewIcon,
  StarIcon,
  ChatIcon,
  GoogleIcon,
  ChartIcon,
} from "./_components/stat-card";
import { RecentCustomers } from "./_components/recent-customers";

/**
 * Dashboard overview: at-a-glance metric cards, recent customers, and quick
 * access to the editable website sections. Analytics-backed cards (Google
 * rating, website visitors) are shown as placeholders until analytics lands.
 */
export default async function AdminHome() {
  const [business, onboarding, stats] = await Promise.all([
    getMyBusiness(),
    getOnboardingView(),
    getDashboardStats(),
  ]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-heading text-2xl tracking-[2px]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray">
          {business
            ? `Managing ${business.name} (/${business.slug}).`
            : "Start the Google Business Profile setup to create your business."}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={stats.todaysAppointments}
          hint="Scheduled for today"
          icon={<CalendarIcon />}
          href="/admin/appointments/calendar"
        />
        <StatCard
          label="Customers"
          value={stats.totalCustomers}
          hint="Total in your CRM"
          icon={<UsersIcon />}
          href="/admin/customers"
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews}
          // Now true: the customer only reaches "requested" once the review
          // request itself has been sent, not when the campaign was queued.
          hint="Asked for a review, awaiting a response"
          icon={<ReviewIcon />}
          href="/admin/reviews"
        />
        <StatCard
          label="Google Rating"
          value="—"
          hint="Analytics coming soon"
          icon={<StarIcon />}
          muted
        />
        <StatCard
          label="Messages Sent"
          value={stats.messagesSent}
          // "Sent", not "delivered": the count is `status in (sent, delivered)`,
          // and delivered only arrives via the carrier's status webhook. A text
          // that left and then bounced would have read as delivered here.
          hint="Review-automation texts sent"
          icon={<ChatIcon />}
          href="/admin/reviews"
        />
        <StatCard
          label="Google Profile Completion"
          value={`${onboarding.percentage}%`}
          progress={onboarding.percentage}
          hint={`${onboarding.completedSteps.length} steps complete`}
          icon={<GoogleIcon />}
          href="/admin/onboarding"
        />
        <StatCard
          label="Website Visitors"
          value="—"
          hint="Analytics coming soon"
          icon={<ChartIcon />}
          muted
        />
      </div>

      {/* Recent customers */}
      <RecentCustomers rows={stats.recentCustomers} />

      {/* Website content shortcuts */}
      <div>
        <h2 className="mb-1 font-heading text-lg tracking-[2px]">
          Website Content
        </h2>
        <p className="text-sm text-gray">
          Edit the sections of your public website. Changes publish instantly.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templateSections(business?.templateCode).map((section) => (
          <Link
            key={section}
            href={`/admin/website/${section}`}
            className="border border-dark-border bg-dark p-5 transition-colors hover:border-gold"
          >
            <span className="font-heading text-lg capitalize tracking-[2px]">
              {section}
            </span>
            <p className="mt-1 text-xs text-gray">Edit the {section} section</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
