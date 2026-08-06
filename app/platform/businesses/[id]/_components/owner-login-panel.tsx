import {
  transferOwnership,
  updateOwnerEmail,
} from "@/features/platform/business-details";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Change the address the client signs in with. Super admin only — the panel is
 * simply not rendered for support or read-only staff, and the action re-checks.
 *
 * Kept apart from Business details because it isn't one: this edits the auth
 * account, not the tenant row, and the two emails serve different purposes.
 */
export function OwnerLoginPanel({
  businessId,
  slug,
  currentEmail,
  publicEmail,
}: {
  businessId: string;
  /** Typed back to confirm a transfer, as the Remove flow does. */
  slug: string;
  /** From the auth user — what they actually type at the login screen. */
  currentEmail: string | null;
  /** `businesses.email`, shown only so the difference is obvious. */
  publicEmail: string | null;
}) {
  return (
    <section className="border border-admin-line bg-admin-panel p-6">
      <h2 className="font-admin-heading text-lg tracking-[2px]">Owner login</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-admin-muted">
        The address this client signs in with. The change takes effect
        immediately and the old address stops working. Recorded in the audit
        trail against your account.
      </p>

      <form action={updateOwnerEmail} className="mt-5 grid max-w-2xl gap-4">
        <input type="hidden" name="businessId" value={businessId} />

        <div className="flex flex-wrap items-end gap-3">
          {/* Full width below sm, original fixed width above. These fields were
              wider than a phone viewport and pushed the whole page sideways. */}
          <label className="flex w-full flex-col gap-1.5 sm:w-auto">
            <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
              Login email
            </span>
            <input
              name="ownerEmail"
              type="email"
              defaultValue={currentEmail ?? ""}
              required
              className="w-full border border-admin-line bg-admin px-3 py-2 text-sm text-admin-fg focus-visible:border-admin-accent focus-visible:outline-none sm:min-w-[20rem]"
            />
          </label>

          <SubmitButton
            pendingLabel="Changing…"
            className="border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
          >
            Change login email
          </SubmitButton>
        </div>

        <label className="flex items-start gap-2 text-sm text-admin-fg/80">
          <input
            type="checkbox"
            name="requireNewPassword"
            value="yes"
            defaultChecked
            className="mt-0.5 accent-admin-accent"
          />
          <span>
            Make them set a new password
            <span className="mt-1 block text-xs leading-relaxed text-admin-muted">
              Their current password is discarded and a reset link is emailed to
              the new address — they can&apos;t get back in until they use it.
              Leave this off if you&apos;re only fixing a typo and they should
              keep working uninterrupted.
            </span>
          </span>
        </label>
      </form>

      {/* The two are constantly confused, so the other one is shown here rather
          than left for someone to discover after changing the wrong thing. */}
      <p className="mt-3 text-xs text-admin-muted">
        Public contact email on their website:{" "}
        <span className="text-admin-fg/80">{publicEmail ?? "—"}</span> — separate
        from this, and not changed here.
      </p>

      <div className="mt-8 border-t border-admin-line pt-6">
        <h3 className="text-sm text-admin-fg">Transfer to a new owner</h3>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-admin-muted">
          For a business that genuinely changes hands. The new owner is invited
          by email, sets their own password, and inherits the shop with every
          customer, booking and page intact — nothing is deleted. Use the field
          above instead if it&apos;s the same person with a new address.
        </p>

        <form
          action={transferOwnership}
          className="mt-4 grid max-w-2xl gap-3"
        >
          <input type="hidden" name="businessId" value={businessId} />

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full flex-col gap-1.5 sm:w-auto">
              <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
                New owner&apos;s email
              </span>
              <input
                name="newOwnerEmail"
                type="email"
                required
                placeholder="new-owner@example.com"
                className="w-full border border-admin-line bg-admin px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus-visible:border-admin-accent focus-visible:outline-none sm:min-w-[18rem]"
              />
            </label>

            <label className="flex w-full flex-col gap-1.5 sm:w-auto">
              <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
                Confirm
              </span>
              <input
                name="confirmSlug"
                autoComplete="off"
                required
                placeholder={`Type "${slug}"`}
                className="w-full border border-admin-line bg-admin px-3 py-2 text-sm text-admin-fg placeholder:text-admin-muted focus-visible:border-admin-accent focus-visible:outline-none sm:min-w-[12rem]"
              />
            </label>

            <SubmitButton
              pendingLabel="Transferring…"
              className="border border-destructive px-4 py-2 text-xs uppercase tracking-[2px] text-destructive transition-colors hover:bg-destructive hover:text-admin-fg"
            >
              Transfer
            </SubmitButton>
          </div>

          <label className="flex items-start gap-2 text-sm text-admin-fg/80">
            <input
              type="checkbox"
              name="removePreviousOwner"
              value="yes"
              className="mt-0.5 accent-admin-accent"
            />
            <span>
              Also delete the previous owner&apos;s account
              <span className="mt-1 block text-xs leading-relaxed text-admin-muted">
                Irreversible, and only safe once the transfer has gone through —
                which is why it happens last. Their past actions stay in the
                audit trail. Leave this off to keep the account around while the
                handover settles.
              </span>
            </span>
          </label>
        </form>
      </div>
    </section>
  );
}
