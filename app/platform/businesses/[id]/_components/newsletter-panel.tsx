import {
  updateNewsletterSender,
  setNewsletterVerified,
} from "@/features/platform/business-details";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Business } from "@/types/business-entity";

/**
 * The address this client's weekly digest is sent from, and whether it is
 * cleared to send.
 *
 * Platform-side rather than in the client back office, for the same reason as
 * the SMS sender ID: this is an arrangement with DNS and a mail provider, not a
 * preference. Worse than useless as a client-editable field — it would look
 * configurable while quietly sending their mail to spam.
 *
 * NOTHING IS SENT until verified: no signup box on their website, no weekly
 * job, no email. That is deliberate. Mail from a domain without SPF and DKIM
 * records is rejected or filtered, and the sender's reputation is spent
 * discovering that.
 */
export function NewsletterPanel({ business }: { business: Business }) {
  const sender = business.newsletterFromEmail;
  const domain = sender?.split("@")[1] ?? null;

  return (
    <section className="border border-admin-line bg-admin-panel p-6">
      <h2 className="font-admin-heading text-lg tracking-[2px]">
        Newsletter sender
      </h2>

      <p className="mt-3 text-sm text-admin-muted">
        <span className="mr-2 inline-block border border-admin-line px-2 py-0.5 text-[0.65rem] uppercase tracking-[2px] text-admin-accent">
          {sender
            ? business.newsletterVerified
              ? "verified"
              : "unverified"
            : "not set"}
        </span>
        {sender
          ? business.newsletterVerified
            ? "Sending is live. The signup box appears on their website and the weekly digest will go out."
            : "Set, but not cleared to send. Their website shows no signup box and nothing is emailed."
          : "No sender. This client has no newsletter."}
      </p>

      <form
        action={updateNewsletterSender}
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="businessId" value={business.id} />

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
            From address
          </span>
          <input
            name="newsletterFromEmail"
            type="email"
            defaultValue={sender ?? ""}
            placeholder="news@theirbakery.ph"
            autoComplete="off"
            className="h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
            From name
          </span>
          <input
            name="newsletterFromName"
            defaultValue={business.newsletterFromName ?? ""}
            placeholder={business.name}
            autoComplete="off"
            className="h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent"
          />
        </label>

        <div className="sm:col-span-2">
          <SubmitButton
            pendingLabel="Saving…"
            className="border border-admin-line px-4 py-2 text-xs uppercase tracking-[2px] text-admin-fg transition-colors hover:border-admin-accent hover:text-admin-accent"
          >
            Save sender
          </SubmitButton>
          <p className="mt-2 text-xs text-admin-muted">
            Changing the address clears verification — a domain that was checked
            is not evidence about a different one.
          </p>
        </div>
      </form>

      {sender && (
        <div className="mt-6 border-t border-admin-line pt-5">
          <h3 className="text-sm text-admin-fg">Verification</h3>
          <ol className="mt-2 grid list-decimal gap-1 pl-4 text-xs leading-relaxed text-admin-muted">
            <li>
              Add <span className="text-admin-fg">{domain}</span> as a sending
              domain with the mail provider.
            </li>
            <li>Put the SPF and DKIM records it gives you into that domain&apos;s DNS.</li>
            <li>Wait for the provider to report the domain as verified.</li>
            <li>Only then, mark it verified here.</li>
          </ol>

          <form action={setNewsletterVerified} className="mt-4 flex gap-3">
            <input type="hidden" name="businessId" value={business.id} />
            <input
              type="hidden"
              name="verified"
              value={business.newsletterVerified ? "false" : "true"}
            />
            <SubmitButton
              pendingLabel={business.newsletterVerified ? "Revoking…" : "Verifying…"}
              className={
                business.newsletterVerified
                  ? "border border-destructive px-4 py-2 text-xs uppercase tracking-[2px] text-destructive transition-colors hover:bg-destructive hover:text-white"
                  : "border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
              }
            >
              {business.newsletterVerified
                ? "Revoke verification"
                : "Mark verified"}
            </SubmitButton>
          </form>
        </div>
      )}
    </section>
  );
}
