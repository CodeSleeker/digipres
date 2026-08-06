import { updateSmsSenderId } from "@/features/platform/business-details";
import { SubmitButton } from "@/components/ui/submit-button";
import { normalizeSenderId } from "@/lib/sms/sender-id";
import type { Business } from "@/types/business-entity";

/**
 * The alphanumeric label this tenant's texts arrive from.
 *
 * Platform-side rather than in the client back office because a sender ID is an
 * arrangement with the carrier, not a preference: it has to be registered before
 * it will be delivered, and an unregistered value is rejected or quietly
 * relabelled. A field the client could edit would look configurable and mostly
 * break their sending.
 */
export function SmsSenderPanel({ business }: { business: Business }) {
  const current = business.smsSenderId;
  // What the carrier would actually receive, so a value that will be trimmed is
  // visible here rather than discovered in a delivery report.
  const effective = current ? normalizeSenderId(current) : null;

  return (
    <section className="border border-admin-line bg-admin-panel p-6">
      <h2 className="font-admin-heading text-lg tracking-[2px]">SMS sender ID</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-admin-muted">
        The name customers see instead of a phone number on this client&apos;s
        texts. Maximum 11 characters, letters, numbers and spaces only — that is
        a GSM limit, not ours.
      </p>

      <form
        action={updateSmsSenderId}
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="businessId" value={business.id} />

        <label className="flex w-full flex-col gap-1.5 sm:w-auto">
          <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
            Sender ID
          </span>
          <input
            name="smsSenderId"
            defaultValue={current ?? ""}
            maxLength={11}
            placeholder="e.g. RoniesBarb"
            autoComplete="off"
            className="w-full border border-admin-line bg-admin px-3 py-2 font-mono text-sm text-admin-fg placeholder:text-admin-muted focus-visible:border-admin-accent focus-visible:outline-none sm:min-w-[16rem]"
          />
        </label>

        <SubmitButton
          pendingLabel="Saving…"
          className="border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
        >
          Save sender ID
        </SubmitButton>
      </form>

      {effective && effective !== current && (
        <p className="mt-3 text-xs text-[#d8b26a]">
          Will be sent as <span className="font-mono">{effective}</span> — the
          stored value contains characters carriers reject.
        </p>
      )}

      <div className="mt-4 border-t border-admin-line pt-4 text-xs leading-relaxed text-admin-muted">
        {current ? (
          <p>
            Texts for this client send as{" "}
            <span className="font-mono text-admin-fg/80">
              {effective ?? current}
            </span>
            . It must be registered with your SMS provider first, or the carrier
            will reject or relabel it.
          </p>
        ) : (
          <p>
            <span className="text-[#d8b26a]">No sender ID set.</span> On
            Semaphore this client&apos;s texts fall back to your account&apos;s
            registered default Sender Name. On PhilSMS they will{" "}
            <span className="text-destructive">not send at all</span> — it has no
            account-level default. Twilio ignores this field entirely and sends
            from your number.
          </p>
        )}
      </div>
    </section>
  );
}
