/**
 * Text for the desktop notification raised when a booking arrives while the
 * dashboard is open but not in view.
 *
 * Built from the raw `appointments` row that Supabase Realtime delivers, which
 * is columns only — the customer's name lives on `customers` and would need a
 * round trip. Service and time are what let the owner decide whether to look
 * now, so that is what the notification carries; the dashboard behind it
 * already shows the name by the time they click through.
 */
export interface BookingAlertRow {
  service?: string | null;
  starts_at?: string | null;
}

export function bookingAlertBody(row: BookingAlertRow): string {
  const service = row.service?.trim() || "New appointment";
  const when = formatSlot(row.starts_at);
  return when ? `${service} · ${when}` : service;
}

/**
 * "2099-01-15T14:30:00.000Z" → "2099-01-15 at 14:30".
 *
 * Sliced, not parsed through `Date`. Appointment times are stored as the
 * customer's wall clock pinned to UTC (see schemas/booking.ts), so converting
 * to the viewer's local zone would shift a 14:30 booking to some other number
 * and disagree with every other screen in the admin, which slices the same way.
 */
function formatSlot(startsAt: string | null | undefined): string | null {
  if (!startsAt || startsAt.length < 16) return null;
  return `${startsAt.slice(0, 10)} at ${startsAt.slice(11, 16)}`;
}
