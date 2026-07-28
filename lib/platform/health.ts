/**
 * How long the review-automation processor may go without running before it's
 * considered stale. The cron fires every 15 minutes (vercel.json), so an hour
 * of silence means several missed ticks — not a blip.
 */
export const CRON_STALE_AFTER_MINUTES = 60;

/**
 * The retention purge runs nightly (vercel.json), so 36 hours of silence means
 * a night was missed — not that it simply hasn't come round yet.
 */
export const RETENTION_STALE_AFTER_MINUTES = 36 * 60;

/** Whole minutes between an ISO timestamp and now; null when never run. */
export function minutesSince(
  iso: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/**
 * Stale when it has never run, or hasn't run within the window. "Never run" is
 * deliberately treated as stale — that's the exact state a platform that was
 * deployed without a scheduler is in.
 */
export function isCronStale(
  minutes: number | null,
  maxMinutes: number = CRON_STALE_AFTER_MINUTES,
): boolean {
  return minutes === null || minutes > maxMinutes;
}
