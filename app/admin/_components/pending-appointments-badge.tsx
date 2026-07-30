"use client";

import { useSyncExternalStore } from "react";
import {
  getNewBookings,
  getServerNewBookings,
  subscribeNewBookings,
} from "./new-bookings-store";

/**
 * The count beside "Appointments" in the nav.
 *
 * `serverCount` is what the database said at render time; the store adds any
 * bookings that have arrived since, so the badge moves the instant one lands
 * rather than waiting for the next server render. A number changing in the
 * sidebar shifts nothing the owner is reading, which is why this updates live
 * while the appointments list deliberately does not.
 */
export function PendingAppointmentsBadge({
  serverCount,
}: {
  serverCount: number;
}) {
  const arrivedSince = useSyncExternalStore(
    subscribeNewBookings,
    getNewBookings,
    getServerNewBookings,
  );

  const total = serverCount + arrivedSince;
  if (total === 0) return null;

  return (
    <span
      className="min-w-5 rounded-full bg-gold px-1.5 py-0.5 text-center text-[0.65rem] font-semibold leading-none text-black"
      // The number alone is ambiguous out of context — a screen reader would
      // otherwise just say "Appointments 3".
      aria-label={`${total} awaiting confirmation`}
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
