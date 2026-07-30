/**
 * How many bookings have arrived since the server last rendered.
 *
 * A module-level store rather than React state because two components in
 * different parts of the layout need the same number: the subscription
 * (app/admin/_components/live-appointments.tsx) writes it, and the sidebar
 * badge reads it. Lifting it into a context would mean wrapping the whole admin
 * shell in a provider for one integer.
 *
 * It is a DELTA on top of the server's count, not a replacement for it. The
 * server number is the truth; this is what has happened since.
 */
let delta = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeNewBookings(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => void listeners.delete(onStoreChange);
}

export function getNewBookings(): number {
  return delta;
}

/** No client store on the server — the badge renders the server count alone. */
export function getServerNewBookings(): number {
  return 0;
}

export function addNewBooking(): void {
  delta += 1;
  emit();
}

/**
 * Clear the delta. Call this whenever the SERVER count has caught up — after a
 * refresh, or on navigation — otherwise the two would be added together and the
 * badge would double-count the same booking.
 */
export function resetNewBookings(): void {
  if (delta === 0) return;
  delta = 0;
  emit();
}
