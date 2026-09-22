import {
  updateTenantSender,
  setSenderVerified,
} from "@/features/platform/business-details";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Business } from "@/types/business-entity";

/**
 * The domain this client's mail is sent from, and the address for each purpose.
 *
 * Platform-side rather than in the client back office, for the same reason as
 * the SMS sender ID: this is an arrangement with DNS and a mail provider, not a
 * preference. Worse than useless as a client-editable field — it would look
 * configurable while quietly sending their mail to spam.
 *
 * THE DOMAIN IS THE UNIT because that is what a provider verifies. DKIM and
 * SPF authenticate elegancebybem.com; every local part on it inherits that. So
 * an owner adds `booking@` without a second verification cycle, and a check
 * constraint stops any address wandering off the domain (migration 0043).
 *
 * NOTHING SENDS AS THEM until verified. Each purpose falls back to the
 * platform's own address, which is the correct behaviour for a tenant who has
 * not brought a domain — not an error.
 */
const FIELD =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg outline-none transition-colors focus:border-admin-accent";

const LABEL = "text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted";

function Purpose({
  name,
  label,
  hint,
  value,
  domain,
}: {
  name: string;
  label: string;
  hint: string;
  value: string | null;
  domain: string | null;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input
        name={name}
        type="email"
        defaultValue={value ?? ""}
        placeholder={domain ? `hello@${domain}` : "set the domain first"}
        autoComplete="off"
        className={FIELD}
      />
      <span className="text-[0.65rem] text-admin-muted">{hint}</span>
    </label>
  );
}

export function SenderPanel({ business }: { business: Business }) {
  const domain = business.senderDomain;
  const verified = business.senderVerified;

  return (
    <section className="border border-admin-line bg-admin-panel p-6">
      <h2 className="font-admin-heading text-lg tracking-[2px]">
        Sending identity
      </h2>

      <p className="mt-3 text-sm text-admin-muted">
        <span className="mr-2 inline-block border border-admin-line px-2 py-0.5 text-[0.65rem] uppercase tracking-[2px] text-admin-accent">
          {domain ? (verified ? "verified" : "unverified") : "not set"}
        </span>
        {domain
          ? verified
            ? `Mail goes out as ${domain}. Any purpose left blank falls back to the platform address.`
            : "Set, but not cleared to send. Everything still goes out from the platform address."
          : "No domain. All of this client's mail goes out from the platform address, under their business name."}
      </p>

      <form
        action={updateTenantSender}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <input type="hidden" name="businessId" value={business.id} />

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Sending domain</span>
          <input
            name="senderDomain"
            defaultValue={domain ?? ""}
            placeholder="elegancebybem.com"
            autoComplete="off"
            className={FIELD}
          />
          <span className="text-[0.65rem] text-admin-muted">
            A domain, not an address. Clearing it switches their own sending off
            and removes the addresses below.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>From name</span>
          <input
            name="senderFromName"
            defaultValue={business.senderFromName ?? ""}
            placeholder={business.name}
            autoComplete="off"
            className={FIELD}
          />
          <span className="text-[0.65rem] text-admin-muted">
            Blank uses the business name.
          </span>
        </label>

        <Purpose
          name="senderEnquiryEmail"
          label="Enquiries"
          hint="The receipt someone gets for an enquiry."
          value={business.senderEnquiryEmail}
          domain={domain}
        />
        <Purpose
          name="senderBookingEmail"
          label="Bookings"
          hint="Booking requests and confirmations to the customer."
          value={business.senderBookingEmail}
          domain={domain}
        />
        <Purpose
          name="senderNewsletterEmail"
          label="Newsletter"
          hint="The weekly digest. Kept apart so a complaint cannot reach the rest."
          value={business.senderNewsletterEmail}
          domain={domain}
        />

        <div className="sm:col-span-2">
          <SubmitButton
            pendingLabel="Saving…"
            className="border border-admin-line px-4 py-2 text-xs uppercase tracking-[2px] text-admin-fg transition-colors hover:border-admin-accent hover:text-admin-accent"
          >
            Save sender
          </SubmitButton>
          <p className="mt-2 text-xs text-admin-muted">
            Changing the domain clears verification — a domain that was checked
            is not evidence about a different one. Changing an address does not,
            because the DNS records say nothing about the part before the @.
          </p>
        </div>
      </form>

      {domain && (
        <div className="mt-6 border-t border-admin-line pt-5">
          <h3 className="text-sm text-admin-fg">Verification</h3>
          <ol className="mt-2 grid list-decimal gap-1 pl-4 text-xs leading-relaxed text-admin-muted">
            <li>
              Add <span className="text-admin-fg">{domain}</span> as a sending
              domain with the mail provider.
            </li>
            <li>
              Put the SPF and DKIM records it gives you into that domain&apos;s
              DNS, unproxied.
            </li>
            <li>Wait for the provider to report the domain as verified.</li>
            <li>Only then, mark it verified here.</li>
          </ol>

          <form action={setSenderVerified} className="mt-4 flex gap-3">
            <input type="hidden" name="businessId" value={business.id} />
            <input
              type="hidden"
              name="verified"
              value={verified ? "false" : "true"}
            />
            <SubmitButton
              pendingLabel={verified ? "Revoking…" : "Verifying…"}
              className={
                verified
                  ? "border border-destructive px-4 py-2 text-xs uppercase tracking-[2px] text-destructive transition-colors hover:bg-destructive hover:text-white"
                  : "border border-admin-accent px-4 py-2 text-xs uppercase tracking-[2px] text-admin-accent transition-colors hover:bg-admin-accent hover:text-admin-on-accent"
              }
            >
              {verified ? "Revoke verification" : "Mark verified"}
            </SubmitButton>
          </form>
        </div>
      )}
    </section>
  );
}
