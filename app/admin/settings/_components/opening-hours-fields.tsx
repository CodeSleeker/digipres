"use client";

import { useState } from "react";
import type { DayHours } from "@/types/business-entity";
import { fieldClass } from "../../website/_forms/form-kit";

/**
 * Opening hours, on the page where someone would look for them.
 *
 * They used to be settable ONLY inside the Google Business onboarding wizard —
 * the same trap the rest of this page's fields were in, and worse for hours
 * than for anything else, because hours are the detail that changes: a public
 * holiday, a season, a week off. Nobody re-enters a wizard called "Google
 * Profile" to say they are shut on Monday.
 *
 * WHERE THEY SHOW UP. `buildContactDetails` derives an HOURS line from these
 * and the templates print it — the footer's contact column, the contact card —
 * and `buildLocalBusinessJsonLd` publishes them as `openingHours`, which is
 * what a search engine reads to answer "are they open now".
 *
 * One catch worth knowing: the template default only fills in when a tenant
 * has NO contact details at all. A business with an address and a phone but no
 * hours simply prints no hours, rather than borrowing the template's.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** A full Sunday–Saturday week, whatever the record happens to hold. */
function seed(hours: DayHours[]): DayHours[] {
  return Array.from({ length: 7 }, (_, day) => {
    const existing = hours.find((h) => h.day === day);
    return (
      existing ?? {
        day: day as DayHours["day"],
        closed: day === 0,
        open: "09:00",
        close: "17:00",
      }
    );
  });
}

export function OpeningHoursFields({ defaults }: { defaults: DayHours[] }) {
  const [hours, setHours] = useState<DayHours[]>(() => seed(defaults));

  function set(day: number, patch: Partial<DayHours>) {
    setHours((prev) =>
      prev.map((h) => (h.day === day ? { ...h, ...patch } : h)),
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
        Opening hours
      </legend>
      <p className="text-xs text-admin-muted">
        Printed on your website and published to search engines. Leave a day
        ticked as closed and it prints &ldquo;Closed&rdquo;.
      </p>

      {/*
       * The form is uncontrolled and posts to `updateBusiness`, which reads
       * `hours` as JSON (features/business/actions.ts). One hidden field kept
       * in step with the state is what bridges the two, and it means the rest
       * of this form stays a genuine partial update.
       */}
      <input
        type="hidden"
        name="hours"
        value={JSON.stringify(
          /*
           * Empty becomes null, not "".
           *
           * The validator takes HH:mm or null and rejects anything else, so a
           * cleared time field would fail the whole save with "Use HH:mm." —
           * against a field the person had deliberately emptied. Same
           * normalisation the onboarding wizard does.
           */
          hours.map((h) => ({
            day: h.day,
            closed: Boolean(h.closed),
            open: h.open || null,
            close: h.close || null,
          })),
        )}
      />

      <div className="grid gap-2">
        {hours.map((h) => (
          <div
            key={h.day}
            className="grid grid-cols-[92px_auto_1fr_1fr] items-center gap-3"
          >
            <span className="text-sm text-admin-fg/80">{DAY_NAMES[h.day]}</span>
            <label className="flex items-center gap-2 text-xs text-admin-muted">
              <input
                type="checkbox"
                className="accent-admin-accent"
                checked={Boolean(h.closed)}
                onChange={(e) => set(h.day, { closed: e.target.checked })}
              />
              Closed
            </label>
            <input
              type="time"
              aria-label={`${DAY_NAMES[h.day]} opening time`}
              className={fieldClass}
              value={h.open ?? ""}
              disabled={Boolean(h.closed)}
              onChange={(e) => set(h.day, { open: e.target.value })}
            />
            <input
              type="time"
              aria-label={`${DAY_NAMES[h.day]} closing time`}
              className={fieldClass}
              value={h.close ?? ""}
              disabled={Boolean(h.closed)}
              onChange={(e) => set(h.day, { close: e.target.value })}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
