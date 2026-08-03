import { submitLead } from "@/features/marketing/leads";
import { PROJECT_TYPES } from "@/schemas/lead";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * The marketing site's two forms.
 *
 * Server components with a plain `action={submitLead}`: no `useActionState`,
 * and the form itself still posts as ordinary HTML. A form asking a stranger
 * for their contact details should not stop working because a script failed.
 *
 * THE ONE CLIENT COMPONENT is the submit button. `SubmitButton` reads
 * `useFormStatus`, which is the only way a server-rendered form can know it is
 * mid-flight. Without it the page looks completely inert after the click — and
 * a form that gives no feedback gets submitted twice, which here means two
 * database rows, two emails and two SMS credits for one enquiry.
 *
 * Progressive enhancement holds: with JavaScript off the button is a plain
 * submit and the form still posts, it just doesn't animate.
 */

const field =
  "w-full border border-[#ccd2dc] bg-white px-3 py-2.5 text-sm text-[#171920] placeholder:text-[#6e747f] focus-visible:border-[#7f6333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]";
const label =
  "text-xs font-medium uppercase tracking-[0.2em] text-[#555c6b]";
const button =
  "w-full bg-[#171920] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-[#f8f9fb] transition-colors hover:bg-[#2b2f3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333] sm:w-auto";

/**
 * Hidden from people, visible to bots. `sr-only` would still be read out by a
 * screen reader and reachable by keyboard, so this is removed from the tab
 * order and from assistive tech as well as from view.
 */
function Honeypot() {
  return (
    <div aria-hidden="true" className="hidden">
      <label htmlFor="company">Company (leave blank)</label>
      <input id="company" name="company" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

/** Rendered from `?sent=` after the redirect. */
export function FormNotice({ status }: { status?: string }) {
  if (!status) return null;

  const messages: Record<string, { text: string; ok: boolean }> = {
    ok: {
      text: "Thanks — we've got it. We'll be in touch shortly.",
      ok: true,
    },
    invalid: {
      text: "Please check the highlighted details and try again.",
      ok: false,
    },
    throttled: {
      text: "That's a few messages in a short time. Please try again later, or email us directly.",
      ok: false,
    },
    error: {
      text: "Something went wrong on our end. Please email us directly.",
      ok: false,
    },
  };

  const notice = messages[status];
  if (!notice) return null;

  return (
    <p
      role="status"
      className={`mb-6 border px-4 py-3 text-sm ${
        notice.ok
          ? "border-[#7f6333]/40 bg-[#7f6333]/10 text-[#7f6333]"
          : "border-[#a8353a]/40 bg-[#a8353a]/10 text-[#a8353a]"
      }`}
    >
      {notice.text}
    </p>
  );
}

/** "Book a consultation" — name, contact, what they need, when suits them. */
export function BookingForm() {
  return (
    <form action={submitLead} className="grid gap-5">
      <input type="hidden" name="kind" value="consultation" />
      <Honeypot />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="b-name" className={label}>
            Your name
          </label>
          <input id="b-name" name="name" required maxLength={120} className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="b-email" className={label}>
            Email
          </label>
          <input
            id="b-email"
            name="email"
            type="email"
            required
            maxLength={254}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="b-phone" className={label}>
            Phone <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="b-phone"
            name="phone"
            type="tel"
            maxLength={32}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="b-type" className={label}>
            What you need
          </label>
          <select id="b-type" name="projectType" className={field} defaultValue="">
            <option value="">Not sure yet</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="b-date" className={label}>
            Preferred date
          </label>
          <input id="b-date" name="preferredDate" type="date" className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="b-time" className={label}>
            Preferred time
          </label>
          <input id="b-time" name="preferredTime" type="time" className={field} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="b-message" className={label}>
          Anything we should know{" "}
          <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="b-message"
          name="message"
          rows={4}
          maxLength={4000}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton
          pendingLabel="Sending…"
          className={`${button} inline-flex items-center justify-center`}
        >
          Request consultation
        </SubmitButton>
        {/* Set expectations here rather than after the fact: the preferred slot
            is a request against a calendar that does not exist yet. */}
        <span className="text-xs leading-relaxed text-[#555c6b]">
          We&apos;ll confirm your slot by email. No obligation.
        </span>
      </div>
    </form>
  );
}

/** General enquiry — deliberately shorter than the booking form. */
export function ContactForm() {
  return (
    <form action={submitLead} className="grid gap-5">
      <input type="hidden" name="kind" value="contact" />
      <Honeypot />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="c-name" className={label}>
            Your name
          </label>
          <input id="c-name" name="name" required maxLength={120} className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="c-email" className={label}>
            Email
          </label>
          <input
            id="c-email"
            name="email"
            type="email"
            required
            maxLength={254}
            className={field}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="c-phone" className={label}>
          Phone <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input id="c-phone" name="phone" type="tel" maxLength={32} className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="c-message" className={label}>
          How can we help?
        </label>
        <textarea
          id="c-message"
          name="message"
          rows={5}
          required
          maxLength={4000}
          className={field}
        />
      </div>

      <SubmitButton
        pendingLabel="Sending…"
        className={`${button} inline-flex items-center justify-center`}
      >
        Send message
      </SubmitButton>
    </form>
  );
}
