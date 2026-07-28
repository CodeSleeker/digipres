/**
 * A once-a-day job has genuinely missed a run only after ~a day and a half —
 * anything less is just "the next run hasn't come round yet".
 */
const DAILY_JOB_TOLERANCE_MINUTES = 36 * 60;

/**
 * How long the review-automation processor may go without running before it's
 * considered stale.
 *
 * KEEP IN SYNC WITH `vercel.json`. Both jobs run daily because Vercel's free
 * plan permits only once-per-day cron schedules. On a plan that allows a
 * every-few-minutes schedule, tighten this to ~60 so a dead scheduler is
 * noticed within the hour.
 */
export const CRON_STALE_AFTER_MINUTES = DAILY_JOB_TOLERANCE_MINUTES;

/** Same tolerance for the nightly retention purge. */
export const RETENTION_STALE_AFTER_MINUTES = DAILY_JOB_TOLERANCE_MINUTES;

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
 * Human-readable age for the health tiles. Daily schedules make raw minutes
 * useless ("1,412m ago"), so this steps up to hours and days.
 */
export function formatAge(minutes: number | null): string {
  if (minutes === null) return "Never";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / (24 * 60))}d ago`;
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
