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
  name: string;
  phone: string;
  email: string;
  address: string;
  addressLocality: string;
  addressRegion: string;
  addressPostalCode: string;
  addressCountry: string;
  /** The stored pin, shown back as "lat, lng" — see the settings page. */
  mapLocation: string;
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
          <h2 className="font-admin-heading text-lg tracking-[2px] text-admin-fg">
            Public contact details
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
            Shown on your website and given to search engines. Customers see
            these.
          </p>
        </div>

        {/* The placeholder names no business and no trade on purpose: this
            field belongs to whoever is reading it, and another shop's name
            sitting in their own name field reads as a mistake. */}
        <TextRow
          name="name"
          label="Business name"
          type="text"
          placeholder="The name customers know you by"
          defaultValue={defaults.name}
          error={state.fieldErrors?.name?.[0]}
          hint="Shown in your site header, page title and search results."
        />
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
            Street address
          </Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={defaults.address}
            placeholder="Unit / building / street"
            className={`${fieldClass} min-h-20 resize-y`}
          />
          <span className="text-[0.65rem] text-admin-muted">
            Just the street part — the city and province go below.
          </span>
          {state.fieldErrors?.address?.[0] && (
            <p role="alert" className="text-xs text-destructive">
              {state.fieldErrors.address[0]}
            </p>
          )}
        </div>

        {/* Split out because search engines and AI assistants can't reliably
            pull a city out of a free-text address — and the city is what makes
            the page resolvable to a place. */}
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <TextRow
            name="addressLocality"
            label="City / town"
            type="text"
            placeholder="Cagayan de Oro"
            defaultValue={defaults.addressLocality}
            error={state.fieldErrors?.addressLocality?.[0]}
          />
          <TextRow
            name="addressRegion"
            label="Province / region"
            type="text"
            placeholder="Misamis Oriental"
            defaultValue={defaults.addressRegion}
            error={state.fieldErrors?.addressRegion?.[0]}
          />
          <TextRow
            name="addressPostalCode"
            label="Postal code"
            type="text"
            placeholder="9000"
            defaultValue={defaults.addressPostalCode}
            error={state.fieldErrors?.addressPostalCode?.[0]}
          />
          <TextRow
            name="addressCountry"
            label="Country code"
            type="text"
            placeholder="PH"
            defaultValue={defaults.addressCountry}
            error={state.fieldErrors?.addressCountry?.[0]}
            hint="Two letters, e.g. PH. Not shown on your site."
          />
        </div>

        {/*
         * The map pin, asked for in the only form an owner can supply it: a
         * pasted link. Nobody knows their own latitude, and asking for two
         * decimal numbers would leave this empty on every account — which is
         * exactly what it has been.
         */}
        <TextRow
          name="mapLocation"
          label="Map location"
          type="text"
          placeholder="Paste a Google Maps link, or 8.2280, 124.9120"
          defaultValue={defaults.mapLocation}
          error={state.fieldErrors?.mapLocation?.[0]}
          hint="Open your place on Google Maps and copy the link from the address bar. This puts a map on your site and tells search engines exactly where you are. Clear the box to remove the pin."
        />
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-admin-heading text-lg tracking-[2px] text-admin-fg">
            Where we send booking alerts
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
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
          <h2 className="font-admin-heading text-lg tracking-[2px] text-admin-fg">
            Text your customers
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">
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
        <label className="flex items-start gap-2 text-sm text-admin-fg/80">
          <input
            type="checkbox"
            checked={textCustomers}
            onChange={(event) => setTextCustomers(event.target.checked)}
            className="mt-0.5 accent-admin-accent"
          />
          Text customers about their bookings
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-admin-line pt-5">
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-admin-accent font-admin-heading tracking-[2px] text-admin-on-accent hover:bg-admin-accent-hover"
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
  "text-[0.7rem] font-normal uppercase tracking-[1.5px] text-admin-muted";

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
      {hint && <span className="text-[0.65rem] text-admin-muted">{hint}</span>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
