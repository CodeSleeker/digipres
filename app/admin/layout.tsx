import type { Metadata } from "next";
import Link from "next/link";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { SuspendedNotice } from "./_components/suspended-notice";
import { logout } from "@/lib/auth/actions";
import { templateSections } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import { ImpersonationBanner } from "./_components/impersonation-banner";
import { getEntitlement } from "@/features/billing/queries";
import { defaultFeatures } from "@/lib/features/catalogue";

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

  // A business that isn't `active` gets a notice instead of the dashboard —
  // rendered in place rather than redirected, so there's no loop and the owner
  // keeps the header (and the way to sign out). Staff acting as the tenant are
  // exempt: they need the real dashboard to fix whatever caused it.
  const blocked =
    business && business.status !== "active" && !isImpersonating
      ? business.status
      : null;

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Pinned nav. `self-start` is load-bearing: a flex item stretches to the
          row's full height by default, and an element already as tall as its
          container has nothing to stick to. `overflow-y-auto` keeps a long nav
          (many features + every template section) reachable on short screens. */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 self-start overflow-y-auto border-r border-dark-border p-6">
        <Link
          href="/admin"
          className="font-heading text-lg tracking-[2px] text-gold"
        >
          DASHBOARD
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Overview
          </Link>
          {features.analytics && (
            <Link
              href="/admin/analytics"
              className="py-1 text-gray-light transition-colors hover:text-gold"
            >
              Analytics
            </Link>
          )}
          <Link
            href="/admin/ai-visibility"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            AI Visibility
          </Link>
          <Link
            href="/admin/onboarding"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Google Profile
          </Link>
          {features.custom_domains && (
            <Link
              href="/admin/domains"
              className="py-1 text-gray-light transition-colors hover:text-gold"
            >
              Domains
            </Link>
          )}
          <Link
            href="/admin/customers"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Customers
          </Link>
          {features.appointments && (
            <Link
              href="/admin/appointments"
              className="py-1 text-gray-light transition-colors hover:text-gold"
            >
              Appointments
            </Link>
          )}
          {features.reviews && (
            <Link
              href="/admin/reviews"
              className="py-1 text-gray-light transition-colors hover:text-gold"
            >
              Review Automation
            </Link>
          )}
          {features.ai_messages && (
            <Link
              href="/admin/ai-messages"
              className="py-1 text-gray-light transition-colors hover:text-gold"
            >
              AI Messages
            </Link>
          )}
          <div className="mb-1 mt-4 text-[0.65rem] uppercase tracking-[2px] text-gray">
            Website
          </div>
          {/* Branding sits above the sections because it isn't one: it's on the
              business record and applies to every template. */}
          <Link
            href="/admin/branding"
            className="py-1 text-gray-light transition-colors hover:text-gold"
          >
            Branding
          </Link>
          {/* Only the sections this tenant's template actually renders. */}
          {templateSections(business?.templateCode).map((section) => (
            <Link
              key={section}
              href={`/admin/website/${section}`}
              className="py-1 capitalize text-gray-light transition-colors hover:text-gold"
            >
              {section}
            </Link>
          ))}
        </nav>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-auto text-xs text-gray transition-colors hover:text-gold"
        >
          View live site ↗
        </a>
      </aside>

      <div className="flex-1">
        {isImpersonating && business && (
          <ImpersonationBanner businessName={business.name} />
        )}
        <header className="flex items-center justify-between border-b border-dark-border px-8 py-4">
          <div className="flex flex-col">
            {business ? (
              <span className="text-sm text-white">
                {business.name}
                <span className="ml-2 text-xs text-gray">/{business.slug}</span>
              </span>
            ) : (
              <span className="text-sm text-gray">No business yet</span>
            )}
            <span className="text-[0.7rem] text-gray">{user.email}</span>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              className="h-8 rounded-none border-dark-border text-xs tracking-[2px] text-white hover:border-gold hover:text-gold"
            >
              LOG OUT
            </Button>
          </form>
        </header>
        <main className="p-8">
          {blocked && business ? (
            <SuspendedNotice businessName={business.name} status={blocked} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
