"use client";

import { useActionState, useState } from "react";
import { updateBusiness } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldClass } from "../../website/_forms/form-kit";
import { SavedNotice } from "@/components/ui/saved-notice";
import { Spinner } from "@/components/ui/submit-button";

/**
 * The business's contact details, in two groups the owner has to be able to
 * tell apart:
 *
 *  - PUBLIC — printed on the website, in the contact card and in the JSON-LD
 *    a search engine reads.
 *  - ALERTS — where a new booking is announced. Blank means "use the public
 *    one", so a one-person shop fills in nothing and everything still works.
 *
 * A plain uncontrolled <form> posting to `updateBusiness`, like the social
 * links form: no client validation to keep in sync with the server, and
 * `readForm` only reads the keys present, so this stays a genuine partial
 * update of the business record.
 */

interface Defaults {
  phone: string;
  email: string;
  address: string;
  notifyPhone: string;
  notifyEmail: string;
  notifyCustomerSms: boolean;
}

export function ContactDetailsForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(updateBusiness, {});

  /**
   * The one controlled field on this form.
   *
   * An unchecked checkbox submits NOTHING, which `readForm` would read as
   * "field omitted, leave it alone" — making the box impossible to untick. So
   * the checkbox carries no `name` and a hidden input submits an explicit
   * "true"/"false" alongside it.
   */
  const [textCustomers, setTextCustomers] = useState(defaults.notifyCustomerSms);

  return (
    <form action={action} className="grid max-w-2xl gap-10">
      <section className="grid gap-4">
        <div>
          <h2 className="font-heading text-lg tracking-[2px] text-white">
            Public contact details
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            Shown on your website and given to search engines. Customers see
            these.
          </p>
        </div>

        <TextRow
          name="phone"
          label="Phone"
          type="tel"
          placeholder="0917-xxx-xxxx"
          defaultValue={defaults.phone}
          error={state.fieldErrors?.phone?.[0]}
        />
        <TextRow
          name="email"
          label="Email"
          type="email"
          placeholder="hello@yourshop.com"
          defaultValue={defaults.email}
          error={state.fieldErrors?.email?.[0]}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address" className={labelClass}>
            Address
          </Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={defaults.address}
            placeholder="Street, city, province"
            className={`${fieldClass} min-h-20 resize-y`}
          />
          {state.fieldErrors?.address?.[0] && (
            <p role="alert" className="text-xs text-destructive">
              {state.fieldErrors.address[0]}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-heading text-lg tracking-[2px] text-white">
            Where we send booking alerts
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            When a customer books on your website we text and email you right
            away. Leave these empty to use your public phone and email above.
            Fill them in if bookings should go somewhere else — a mobile that
            can receive texts, or a personal inbox you actually watch rather
            than a shared one.
          </p>
        </div>

        <TextRow
          name="notifyPhone"
          label="Alert phone (SMS)"
          type="tel"
          placeholder={defaults.phone || "0917-xxx-xxxx"}
          defaultValue={defaults.notifyPhone}
          error={state.fieldErrors?.notifyPhone?.[0]}
          hint={
            defaults.notifyPhone
              ? undefined
              : defaults.phone
                ? `Currently texting ${defaults.phone}`
                : "No phone on file — no booking texts will be sent."
          }
        />
        <TextRow
          name="notifyEmail"
          label="Alert email"
          type="email"
          placeholder={defaults.email || "you@yourshop.com"}
          defaultValue={defaults.notifyEmail}
          error={state.fieldErrors?.notifyEmail?.[0]}
          hint={
            defaults.notifyEmail
              ? undefined
              : defaults.email
                ? `Currently emailing ${defaults.email}`
                : "No email on file — no booking emails will be sent."
          }
        />
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-heading text-lg tracking-[2px] text-white">
            Text your customers
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray">
            Two messages: one when they submit a booking (“we have your
            request”) and one when you confirm it. Each is charged per text, and
            the number sent depends on how busy your website is — switch this
            off to keep only your own alerts. Anyone who has replied STOP is
            never texted either way.
          </p>
        </div>

        {/* Always submits, so unticking actually saves — see the note above. */}
        <input
          type="hidden"
          name="notifyCustomerSms"
          value={textCustomers ? "true" : "false"}
        />
        <label className="flex items-start gap-2 text-sm text-gray-light">
          <input
            type="checkbox"
            checked={textCustomers}
            onChange={(event) => setTextCustomers(event.target.checked)}
            className="mt-0.5 accent-gold"
          />
          Text customers about their bookings
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-dark-border pt-5">
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-gold font-heading tracking-[2px] text-black hover:bg-gold-light"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              SAVING…
            </span>
          ) : (
            "SAVE DETAILS"
          )}
        </Button>
        <SavedNotice token={state.success ? state : null}>
          Saved — changes are live.
        </SavedNotice>
        {state.error && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}

const labelClass =
  "text-[0.7rem] font-normal uppercase tracking-[1.5px] text-gray";

function TextRow({
  name,
  label,
  type,
  placeholder,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  defaultValue: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className={labelClass}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={fieldClass}
      />
      {hint && <span className="text-[0.65rem] text-gray">{hint}</span>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
