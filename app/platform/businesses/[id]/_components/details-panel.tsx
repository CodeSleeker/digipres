import { updateBusinessDetails } from "@/features/platform/business-details";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Business } from "@/types/business-entity";

/**
 * Edit the client's business name from the portal, without impersonating.
 *
 * Name only. The slug is shown but not editable — it is the tenant's live
 * address, and changing it belongs in its own flow with a confirmation rather
 * than in a field someone can tab through by accident.
 */
export function DetailsPanel({ business }: { business: Business }) {
  return (
    <section className="border border-admin-line bg-admin-panel p-6">
      <h2 className="font-admin-heading text-lg tracking-[2px]">Business details</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-admin-muted">
        The name appears on the client&apos;s website — the header, the page
        title and its search-engine listing — so saving here republishes their
        site. The change is recorded in the audit trail against your account.
      </p>

      <form
        action={updateBusinessDetails}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="businessId" value={business.id} />

        {/* Full width on a phone, the old fixed width from sm up. A bare
            `min-w-[20rem]` is wider than a 375px viewport once the panel's
            padding is taken off, so it forced the page to scroll sideways. */}
        <label className="flex w-full flex-col gap-1.5 sm:w-auto">
          <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
            Business name
          </span>
          <input
            name="name"
            defaultValue={business.name}
            required
            maxLength={120}
            className="w-full border border-admin-line bg-admin px-3 py-2 text-sm text-admin-fg focus-visible:border-admin-accent focus-visible:outline-none sm:min-w-[20rem]"
          />
        </label>

        <SubmitButton
          pendingLabel="Saving…"
          className="border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
        >
          Save name
        </SubmitButton>
      </form>

      <p className="mt-3 text-xs text-admin-muted">
        Address:{" "}
        <span className="text-admin-fg/80">/{business.slug}</span> — the slug is
        the live site&apos;s URL and isn&apos;t editable here.
      </p>
    </section>
  );
}
