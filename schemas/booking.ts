import { z } from "zod";

/**
 * A booking request submitted by a MEMBER OF THE PUBLIC from a tenant's contact
 * form. Distinct from `createAppointmentSchema`, which is the owner-facing shape
 * behind auth — this one is parsed from an unauthenticated request body, so it
 * is deliberately narrow: no status, no customer id, no business id.
 *
 * The tenant is resolved from the request host, never from this payload (see
 * lib/tenant/request-tenant.ts).
 */

const trimmed = (max: number) => z.string().trim().max(max);

const optional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    trimmed(max).optional(),
  );

export const bookingRequestSchema = z.object({
  name: trimmed(120).min(1, "Please enter your name."),
  phone: trimmed(40).min(1, "Please enter a contact number."),
  service: trimmed(160).min(1, "Please choose a service."),
  /** <input type="date"> → YYYY-MM-DD. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  /**
   * <input type="time"> → HH:mm, 24-hour. The regex is anchored on the hour and
   * minute ranges rather than just the shape: Safari and some Android keyboards
   * will hand over a seconds component or an out-of-range hour, and "25:00"
   * would otherwise become a silently wrong timestamp.
   */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please choose a valid time."),
  /** "barber" in the barber template; the staff member requested, if any. */
  barber: optional(160),
  notes: optional(2000),
  /**
   * Only consulted when the request host does not identify a tenant — local
   * dev and the apex domain, where the site is served from /s/<slug>. On a real
   * tenant host the host wins and this is ignored entirely.
   */
  slug: optional(63),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

/**
 * Reject a booking for a day that has already passed.
 *
 * Compared as calendar days in UTC rather than as instants. The client picked a
 * date in their own timezone and the server may be hours behind it; comparing
 * timestamps would refuse a legitimate "today" booking for anyone east of the
 * server. A day of slack in the customer's favour is the right error to make.
 *
 * Deliberately day-level even though a time is now collected. Checking the time
 * too would need the shop's timezone, which `businesses` doesn't record — so it
 * would reject real bookings for anyone whose clock is ahead of the server's.
 * An owner declining a 9am slot booked at 9:30 is a far cheaper failure than a
 * customer being told a valid time is in the past.
 */
export function isPastDate(date: string, now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return date < today;
}

/**
 * The instant to store for a requested day and time.
 *
 * The customer means their own wall clock ("2pm at the shop"), and the app has
 * no timezone to convert from — so the wall clock is stored verbatim as UTC and
 * read back the same way. The dashboard renders `starts_at` by slicing the ISO
 * string, so 14:00 in, 14:00 out, on every server in every region.
 *
 * The consequence to know: these timestamps are consistent, not absolute. Any
 * future feature that does real time maths across zones (reminder scheduling,
 * an iCal export) needs a `timezone` column on `businesses` first.
 */
export function bookingStartsAt(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}
