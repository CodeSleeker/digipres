import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBusinessBilling,
  getPlatformBusiness,
} from "@/features/platform/queries";
import { BillingPanel } from "./_components/billing-panel";
import { startImpersonation } from "@/features/platform/impersonation";
import { getPlatformRole } from "@/lib/auth/require-platform-admin";
import { LifecyclePanel } from "./_components/lifecycle-panel";
import { DetailsPanel } from "./_components/details-panel";
import { formatAddress } from "@/lib/businesses/address";
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
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          ← All businesses
        </Link>
        <h1 className="mt-2 font-heading text-2xl tracking-[2px]">
          {business.name}
        </h1>
        <p className="mt-1 text-sm text-gray">
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
        <h2 className="mb-3 font-heading text-lg tracking-[2px]">Profile</h2>
        <dl className="grid gap-px overflow-hidden border border-dark-border bg-dark-border sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-dark px-4 py-3">
              <dt className="text-[0.65rem] uppercase tracking-[1.5px] text-gray">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm text-gray-light">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg tracking-[2px]">Domains</h2>
        {domains.length === 0 ? (
          <p className="border border-dark-border bg-dark p-5 text-sm text-gray">
            No custom domains connected.
          </p>
        ) : (
          <ul className="grid gap-2">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-3 border border-dark-border bg-dark px-4 py-3 text-sm"
              >
                <span className="text-white">{d.hostname}</span>
                {d.isPrimary && (
                  <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-[1px] text-gold">
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
      {role && role !== "read_only" && <DetailsPanel business={business} />}

      <section className="border-t border-dark-border pt-6">
        <h2 className="font-heading text-lg tracking-[2px]">Support</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray">
          Open this client&apos;s back office as them, to help with setup or
          troubleshooting. The session lasts 30 minutes, shows a banner
          throughout, and every change made inside it is written to the audit
          log.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <form action={startImpersonation}>
            <input type="hidden" name="businessId" value={business.id} />
            <button
              type="submit"
              className="border border-gold px-4 py-2 text-xs uppercase tracking-[2px] text-gold transition-colors hover:bg-gold hover:text-black"
            >
              Act as this business
            </button>
          </form>
          <Link
            href={`/platform/audit?business=${business.id}`}
            className="text-xs text-gray transition-colors hover:text-gold"
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
