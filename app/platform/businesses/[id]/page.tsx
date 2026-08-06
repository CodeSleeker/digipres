import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { notFound } from "next/navigation";
import {
  getBusinessBilling,
  getPlatformBusiness,
  getOwnerLoginEmail,
} from "@/features/platform/queries";
import { BillingPanel } from "./_components/billing-panel";
import { startImpersonation } from "@/features/platform/impersonation";
import { getPlatformRole } from "@/lib/auth/require-platform-admin";
import { LifecyclePanel } from "./_components/lifecycle-panel";
import { DetailsPanel } from "./_components/details-panel";
import { SmsSenderPanel } from "./_components/sms-sender-panel";
import { NewsletterPanel } from "./_components/newsletter-panel";
import { formatAddress } from "@/lib/businesses/address";
import { OwnerLoginPanel } from "./_components/owner-login-panel";
import { onboardingPercentage } from "@/types/onboarding";
import { StatTile } from "../../_components/stat-tile";

/** Read-only tenant detail for platform staff. */
export default async function PlatformBusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    billingError?: string;
    lifecycleError?: string;
    detailsError?: string;
  }>;
}) {
  const { id } = await params;
  const { billingError, lifecycleError, detailsError } = await searchParams;
  const { business, counts, domains } = await getPlatformBusiness(id);
  if (!business) notFound();

  const billing = await getBusinessBilling(id);
  const role = await getPlatformRole();

  const facts: [string, string][] = [
    ["Slug", `/${business.slug}`],
    ["Category", business.category],
    ["Owner name", business.ownerName ?? "—"],
    ["Phone", business.phone ?? "—"],
    ["Email", business.email ?? "—"],
    ["Address", formatAddress(business) ?? "—"],
    ["Created", new Date(business.createdAt).toLocaleString()],
  ];

  return (
    <div className="grid gap-8">
      <div>
        <Link
          href="/platform/businesses"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          ← All businesses
        </Link>
        <h1 className="mt-2 font-admin-heading text-2xl tracking-[2px]">
          {business.name}
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Onboarding {onboardingPercentage(business.onboarding)}% complete
          {business.deletedAt && " · archived"}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Customers" value={counts.customers} />
        <StatTile label="Appointments" value={counts.appointments} />
        <StatTile label="Messages sent" value={counts.messagesSent} />
        <StatTile label="Domains" value={counts.domains} />
      </section>

      <section>
        <h2 className="mb-3 font-admin-heading text-lg tracking-[2px]">Profile</h2>
        <dl className="grid gap-px overflow-hidden border border-admin-line bg-admin-line sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-admin-panel px-4 py-3">
              <dt className="text-[0.65rem] uppercase tracking-[1.5px] text-admin-muted">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm text-admin-fg/80">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="mb-3 font-admin-heading text-lg tracking-[2px]">Domains</h2>
        {domains.length === 0 ? (
          <p className="border border-admin-line bg-admin-panel p-5 text-sm text-admin-muted">
            No custom domains connected.
          </p>
        ) : (
          <ul className="grid gap-2">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-3 border border-admin-line bg-admin-panel px-4 py-3 text-sm"
              >
                <span className="text-admin-fg">{d.hostname}</span>
                {d.isPrimary && (
                  <span className="rounded-full border border-admin-accent/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] text-admin-accent">
                    Primary
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] ${
                    d.verified
                      ? "border-[#6cbf84]/40 text-[#6cbf84]"
                      : "border-[#d8b26a]/40 text-[#d8b26a]"
                  }`}
                >
                  {d.verified ? "Verified" : "Pending DNS"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {billingError && (
        <p
          role="alert"
          className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {billingError}
        </p>
      )}

      <BillingPanel
        businessId={business.id}
        plans={billing.plans}
        entitlement={billing.entitlement}
        overrides={billing.overrides}
      />

      {detailsError && (
        <p
          role="alert"
          className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {detailsError}
        </p>
      )}

      {/* Read-only for read_only staff, same rule the other write panels use. */}
      {role && role !== "read_only" && (
        <>
          <DetailsPanel business={business} />
          <SmsSenderPanel business={business} />
          <NewsletterPanel business={business} />
        </>
      )}

      {/* Super admin only — repointing a login is account-takeover territory. */}
      {role === "super_admin" && (
        <OwnerLoginPanel
          businessId={business.id}
          slug={business.slug}
          currentEmail={await getOwnerLoginEmail(business.ownerId)}
          publicEmail={business.email}
        />
      )}

      <section className="border-t border-admin-line pt-6">
        <h2 className="font-admin-heading text-lg tracking-[2px]">Support</h2>
        <p className="mt-1 max-w-2xl text-sm text-admin-muted">
          Open this client&apos;s back office as them, to help with setup or
          troubleshooting. The session lasts 30 minutes, shows a banner
          throughout, and every change made inside it is written to the audit
          log.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <form action={startImpersonation}>
            <input type="hidden" name="businessId" value={business.id} />
            <SubmitButton
              pendingLabel="Starting session…"
              className="inline-flex items-center border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
            >
              Act as this business
            </SubmitButton>
          </form>
          <Link
            href={`/platform/audit?business=${business.id}`}
            className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
          >
            View audit trail →
          </Link>
        </div>
      </section>

      {lifecycleError && (
        <p
          role="alert"
          className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {lifecycleError}
        </p>
      )}

      {role && <LifecyclePanel business={business} role={role} />}
    </div>
  );
}
