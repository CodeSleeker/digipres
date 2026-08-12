"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateLodgingDetails } from "@/features/business/actions";
import type { BusinessFormState } from "@/features/business/actions";
import type { LodgingDetails } from "@/types/business-entity";

const fieldClass =
  "h-auto w-full rounded-none border border-admin-line bg-admin-field px-3 py-2 text-sm text-admin-fg shadow-none outline-none focus-visible:border-admin-accent focus-visible:ring-0";

const labelClass =
  "mb-1.5 block text-[0.7rem] font-normal uppercase tracking-[1.5px] text-admin-muted";

/**
 * The facts a place to stay has and a shop does not.
 *
 * Shown only to a lodging tenant, and written straight into schema.org
 * `LodgingBusiness` markup — so this form is the difference between an answer
 * engine knowing the business is a lodging and being able to say what time
 * check-in is.
 *
 * Everything is optional on purpose. An owner who doesn't know their exact
 * occupancy should be able to fill in the rest, and a blank field publishes
 * nothing rather than a guess.
 */
export function LodgingDetailsForm({
  defaults,
}: {
  defaults: LodgingDetails | null;
}) {
  const [state, action] = useActionState<BusinessFormState, FormData>(
    updateLodgingDetails,
    {},
  );
  const d = defaults ?? {};

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      <div>
        <h2 className="font-admin-heading text-lg tracking-[2px]">
          Your place
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-admin-muted">
          Search engines and AI assistants read these directly. Filling them in
          is what lets an assistant answer &ldquo;what time is check-in?&rdquo;
          or &ldquo;do they take dogs?&rdquo; about your property. Leave
          anything you&rsquo;re unsure of blank — a blank answer says nothing,
          which is better than a wrong one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row
          name="checkInTime"
          label="Check-in from"
          type="time"
          defaultValue={d.checkInTime ?? ""}
          error={state.fieldErrors?.checkInTime?.[0]}
        />
        <Row
          name="checkOutTime"
          label="Check-out by"
          type="time"
          defaultValue={d.checkOutTime ?? ""}
          error={state.fieldErrors?.checkOutTime?.[0]}
        />
        <Row
          name="bedrooms"
          label="Bedrooms"
          type="number"
          defaultValue={d.bedrooms ? String(d.bedrooms) : ""}
          error={state.fieldErrors?.bedrooms?.[0]}
        />
        <Row
          name="maxGuests"
          label="Sleeps (max guests)"
          type="number"
          defaultValue={d.maxGuests ? String(d.maxGuests) : ""}
          error={state.fieldErrors?.maxGuests?.[0]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="petsAllowed" className={labelClass}>
          Pets
        </Label>
        {/*
         * Three states, not a checkbox. "Not said" has to be distinguishable
         * from "no" — a checkbox nobody ticked would publish `petsAllowed:
         * false` as though the owner had answered.
         */}
        <select
          id="petsAllowed"
          name="petsAllowed"
          defaultValue={
            d.petsAllowed === true ? "yes" : d.petsAllowed === false ? "no" : ""
          }
          className={fieldClass}
        >
          <option value="">Prefer not to say</option>
          <option value="yes">Pets welcome</option>
          <option value="no">No pets</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amenities" className={labelClass}>
          Amenities
        </Label>
        <Textarea
          id="amenities"
          name="amenities"
          rows={6}
          defaultValue={(d.amenities ?? []).join("\n")}
          placeholder={"Wifi\nFree parking\nFull kitchen\nHot water\nFireplace"}
          className={`${fieldClass} min-h-32 resize-y`}
        />
        <span className="text-[0.65rem] text-admin-muted">
          One per line. These are the details guests ask about before booking —
          wifi, parking, kitchen, heating, whether there is hot water.
        </span>
        {state.fieldErrors?.amenities?.[0] && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.amenities[0]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton
          pendingLabel="Saving…"
          className="inline-flex h-9 items-center rounded-none border border-admin-line px-4 text-sm text-admin-fg transition-colors hover:border-admin-accent hover:text-admin-accent"
        >
          Save
        </SubmitButton>
        {state.success && (
          <span className="text-xs text-admin-accent">Saved.</span>
        )}
        {state.error && (
          <span className="text-xs text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}

function Row({
  name,
  label,
  type,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  type: string;
  defaultValue: string;
  error?: string;
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
        min={type === "number" ? 1 : undefined}
        defaultValue={defaultValue}
        className={fieldClass}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
