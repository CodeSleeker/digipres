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
    <section className="border border-dark-border bg-dark p-6">
      <h2 className="font-heading text-lg tracking-[2px]">Owner login</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray">
        The address this client signs in with. The change takes effect
        immediately and the old address stops working. Recorded in the audit
        trail against your account.
      </p>

      <form action={updateOwnerEmail} className="mt-5 grid max-w-2xl gap-4">
        <input type="hidden" name="businessId" value={businessId} />

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-[1.5px] text-gray">
              Login email
            </span>
            <input
              name="ownerEmail"
              type="email"
              defaultValue={currentEmail ?? ""}
              required
              className="min-w-[20rem] border border-dark-border bg-black px-3 py-2 text-sm text-white focus-visible:border-gold focus-visible:outline-none"
            />
          </label>

          <SubmitButton
            pendingLabel="Changing…"
            className="border border-gold px-4 py-2 text-xs uppercase tracking-[2px] text-gold transition-colors hover:bg-gold hover:text-black"
          >
            Change login email
          </SubmitButton>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-light">
          <input
            type="checkbox"
            name="requireNewPassword"
            value="yes"
            defaultChecked
            className="mt-0.5 accent-gold"
          />
          <span>
            Make them set a new password
            <span className="mt-1 block text-xs leading-relaxed text-gray">
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
      <p className="mt-3 text-xs text-gray">
        Public contact email on their website:{" "}
        <span className="text-gray-light">{publicEmail ?? "—"}</span> — separate
        from this, and not changed here.
      </p>

      <div className="mt-8 border-t border-dark-border pt-6">
        <h3 className="text-sm text-white">Transfer to a new owner</h3>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray">
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
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] uppercase tracking-[1.5px] text-gray">
                New owner&apos;s email
              </span>
              <input
                name="newOwnerEmail"
                type="email"
                required
                placeholder="new-owner@example.com"
                className="min-w-[18rem] border border-dark-border bg-black px-3 py-2 text-sm text-white placeholder:text-gray focus-visible:border-gold focus-visible:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] uppercase tracking-[1.5px] text-gray">
                Confirm
              </span>
              <input
                name="confirmSlug"
                autoComplete="off"
                required
                placeholder={`Type "${slug}"`}
                className="min-w-[12rem] border border-dark-border bg-black px-3 py-2 text-sm text-white placeholder:text-gray focus-visible:border-gold focus-visible:outline-none"
              />
            </label>

            <SubmitButton
              pendingLabel="Transferring…"
              className="border border-destructive px-4 py-2 text-xs uppercase tracking-[2px] text-destructive transition-colors hover:bg-destructive hover:text-white"
            >
              Transfer
            </SubmitButton>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-light">
            <input
              type="checkbox"
              name="removePreviousOwner"
              value="yes"
              className="mt-0.5 accent-gold"
            />
            <span>
              Also delete the previous owner&apos;s account
              <span className="mt-1 block text-xs leading-relaxed text-gray">
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
