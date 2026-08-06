import type { Metadata } from "next";
import { getOwnerContext } from "@/lib/tenant/business-context";
import {
  DashboardShell,
  NavLink,
} from "@/components/admin/dashboard-shell";
import { SuspendedNotice } from "./_components/suspended-notice";
import { logout } from "@/lib/auth/actions";
import { templateSections } from "@/templates/registry";
import { adminTheme } from "@/lib/admin/theme";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImpersonationBanner } from "./_components/impersonation-banner";
import { getEntitlement } from "@/features/billing/queries";
import { defaultFeatures } from "@/lib/features/catalogue";
import { getPendingAppointmentCount } from "@/features/appointments/queries";
import { LiveAppointments } from "./_components/live-appointments";
import { DesktopAlertsToggle } from "./_components/desktop-alerts-toggle";
import { BookingSoundSettings } from "./_components/booking-sound-settings";
import { PendingAppointmentsBadge } from "./_components/pending-appointments-badge";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin dashboard shell. Guards the whole /admin area (belt-and-suspenders with
 * the middleware), and provides the CMS navigation + logout.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tenant context: the acting owner and their business (business may be null
  // before onboarding). Surfaced in the header so it's always clear which tenant
  // the dashboard is acting on.
  const { supabase, user, business, businessId, isImpersonating } =
    await getOwnerContext();

  // Hide capabilities the plan doesn't include. The pages and actions enforce
  // it too — this is presentation, not the gate.
  const features = businessId
    ? (await getEntitlement(supabase, businessId)).features
    : defaultFeatures();

  // The nav badge. Only worth a query when the nav item is actually rendered.
  const pendingAppointments = features.appointments
    ? await getPendingAppointmentCount()
    : 0;

  // A business that isn't `active` gets a notice instead of the dashboard —
  // rendered in place rather than redirected, so there's no loop and the owner
  // keeps the header (and the way to sign out). Staff acting as the tenant are
  // exempt: they need the real dashboard to fix whatever caused it.
  const blocked =
    business && business.status !== "active" && !isImpersonating
      ? business.status
      : null;

  return (
    <DashboardShell
      brandLabel="DASHBOARD"
      brandHref="/admin"
      // The client's own colours. Resolved from the same template + theme their
      // website renders with, so a pastry studio's back office is paper and
      // mint rather than the barber's gold on black.
      theme={adminTheme(business?.templateCode, business?.themeCode)}
      banner={
        isImpersonating && business ? (
          <ImpersonationBanner businessName={business.name} />
        ) : null
      }
      nav={
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink href="/admin">Overview</NavLink>
          {features.analytics && (
            <NavLink href="/admin/analytics">Analytics</NavLink>
          )}
          <NavLink href="/admin/ai-visibility">AI Visibility</NavLink>
          <NavLink href="/admin/onboarding">Google Profile</NavLink>
          <NavLink href="/admin/settings">Contact details</NavLink>
          {features.custom_domains && (
            <NavLink href="/admin/domains">Domains</NavLink>
          )}
          <NavLink href="/admin/customers">Customers</NavLink>
          {features.appointments && (
            <NavLink
              href="/admin/appointments"
              className="flex items-center justify-between gap-2"
            >
              Appointments
              <PendingAppointmentsBadge serverCount={pendingAppointments} />
            </NavLink>
          )}
          {features.reviews && (
            <NavLink href="/admin/reviews">Review Automation</NavLink>
          )}
          {/* Shown only to a tenant whose newsletter is actually set up —
              otherwise it is a section that can do nothing, and its first
              screen would have to explain why. */}
          {business?.newsletterVerified && (
            <NavLink href="/admin/creations">New Creations</NavLink>
          )}
          {features.ai_messages && (
            <NavLink href="/admin/ai-messages">AI Messages</NavLink>
          )}
          <div className="mb-1 mt-4 text-[0.65rem] uppercase tracking-[2px] text-admin-muted">
            Website
          </div>
          {/* Branding sits above the sections because it isn't one: it's on the
              business record and applies to every template. */}
          <NavLink href="/admin/branding">Branding</NavLink>
          {/* Only the sections this tenant's template actually renders. */}
          {templateSections(business?.templateCode).map((section) => (
            <NavLink
              key={section}
              href={`/admin/website/${section}`}
              className="capitalize"
            >
              {section}
            </NavLink>
          ))}
        </nav>
      }
      navFooter={
        <>
          {/* In the sidebar so its status line is visible; the toast it also
              renders is position-fixed, so where it sits in the DOM is
              irrelevant — including while the drawer is shut. */}
          {businessId && features.appointments && !blocked && (
            <LiveAppointments businessId={businessId} />
          )}
          {features.appointments && <BookingSoundSettings />}
          {features.appointments && <DesktopAlertsToggle />}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
          >
            View live site ↗
          </a>
        </>
      }
      headerLeft={
        business ? (
          <>
            <span className="truncate text-sm text-admin-fg">
              {business.name}
              <span className="ml-2 text-xs text-admin-muted">/{business.slug}</span>
            </span>
            <span className="truncate text-[0.7rem] text-admin-muted">
              {user.email}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-admin-muted">No business yet</span>
            <span className="truncate text-[0.7rem] text-admin-muted">
              {user.email}
            </span>
          </>
        )
      }
      headerRight={
        <form action={logout}>
          <SubmitButton
            pendingLabel="SIGNING OUT…"
            className="inline-flex h-8 items-center rounded-none border border-admin-line px-3 text-xs tracking-[2px] text-admin-fg transition-colors hover:border-admin-accent hover:text-admin-accent sm:px-4"
          >
            {/* The word is redundant next to the icon-free header on a phone,
                but "OUT" alone reads as a truncation bug — so keep it whole and
                buy the room back from the padding instead. */}
            LOG OUT
          </SubmitButton>
        </form>
      }
    >
      {blocked && business ? (
        <SuspendedNotice businessName={business.name} status={blocked} />
      ) : (
        children
      )}
    </DashboardShell>
  );
}
