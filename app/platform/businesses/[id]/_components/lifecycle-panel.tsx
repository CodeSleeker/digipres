import {
  suspendBusiness,
  reactivateBusiness,
  deleteBusiness,
} from "@/features/platform/lifecycle";
import type { Business } from "@/types/business-entity";
import type { PlatformRole } from "@/types/platform";
import { SubmitButton } from "@/components/ui/submit-button";

const STATUS_COPY: Record<Business["status"], string> = {
  active: "Live — the website is serving and the owner has full access.",
  suspended:
    "Service paused — the website returns 404 and the owner sees a notice instead of the dashboard. Nothing has been deleted.",
  draft: "Not published — the website isn't live yet.",
};

/**
 * Suspend / reactivate / remove a client.
 *
 * Suspension is reversible and is the right tool for non-payment. Removal is a
 * soft delete (data retained, slug and owner freed for reuse) and is restricted
 * to super admins — support staff can stop service but not end the client
 * relationship.
 */
export function LifecyclePanel({
  business,
  role,
}: {
  business: Business;
  role: PlatformRole;
}) {
  const isSuperAdmin = role === "super_admin";
  const canWrite = role !== "read_only";

  return (
    <section className="border border-dark-border bg-dark p-6">
      <h2 className="font-heading text-lg tracking-[2px]">Lifecycle</h2>

      <p className="mt-3 text-sm text-gray-light">
        <span className="mr-2 inline-block border border-dark-border px-2 py-0.5 text-[0.65rem] uppercase tracking-[2px] text-gold">
          {business.status}
        </span>
        {STATUS_COPY[business.status]}
      </p>

      {!canWrite && (
        <p className="mt-4 text-xs text-gray">
          Read-only access — lifecycle changes require support or super admin.
        </p>
      )}

      {canWrite && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {business.status === "active" ? (
            <form action={suspendBusiness}>
              <input type="hidden" name="businessId" value={business.id} />
              <SubmitButton
                pendingLabel="Suspending…"
                className="border border-dark-border px-4 py-2 text-xs uppercase tracking-[2px] text-white transition-colors hover:border-gold hover:text-gold"
              >
                Suspend service
              </SubmitButton>
            </form>
          ) : (
            <form action={reactivateBusiness}>
              <input type="hidden" name="businessId" value={business.id} />
              <SubmitButton
                pendingLabel="Reactivating…"
                className="border border-gold px-4 py-2 text-xs uppercase tracking-[2px] text-gold transition-colors hover:bg-gold hover:text-black"
              >
                Reactivate
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      {isSuperAdmin && (
        <div className="mt-8 border-t border-dark-border pt-6">
          <h3 className="text-sm text-destructive">Remove this client</h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray">
            Takes the site offline and removes the business from the platform.
            The record is retained (soft delete), so this can be undone in the
            database — and the slug and owner account become free to reuse. To
            pause a client temporarily, suspend instead.
          </p>
          <form action={deleteBusiness} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="businessId" value={business.id} />
            <label className="sr-only" htmlFor="confirmSlug">
              Type {business.slug} to confirm
            </label>
            <input
              id="confirmSlug"
              name="confirmSlug"
              autoComplete="off"
              placeholder={`Type "${business.slug}" to confirm`}
              className="min-w-[16rem] border border-dark-border bg-black px-3 py-2 text-sm text-white placeholder:text-gray focus-visible:border-gold focus-visible:outline-none"
            />
            <SubmitButton
              pendingLabel="Removing…"
              className="border border-destructive px-4 py-2 text-xs uppercase tracking-[2px] text-destructive transition-colors hover:bg-destructive hover:text-white"
            >
              Remove
            </SubmitButton>
          </form>
        </div>
      )}
    </section>
  );
}
