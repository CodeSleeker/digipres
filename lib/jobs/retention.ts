export interface RetentionWindows {
  /** Terminal review messages (sent/delivered/failed/cancelled). */
  messageDays: number;
  /** Scheduled-job execution history. */
  jobRunDays: number;
  /** Staff audit trail — kept longest; it is the accountability record. */
  auditDays: number;
  /**
   * Messenger transcripts.
   *
   * The most sensitive data the platform holds — other people's private
   * conversations — so the default matches the shortest window in use rather
   * than the longest. The `conversations` row survives; only the messages go.
   */
  messengerDays: number;
}

/** What the database function defaults to when nothing is configured. */
export const DEFAULT_RETENTION: RetentionWindows = {
  messageDays: 90,
  jobRunDays: 90,
  auditDays: 730,
  messengerDays: 90,
};

/** Windows are >= 1 day; the purge function rejects anything smaller. */
const MIN_DAYS = 1;

/**
 * Read the retention windows from the environment, falling back to the defaults.
 *
 * A malformed or too-small value falls back rather than shortening the window:
 * a typo in an env var must never quietly start deleting live data — and for
 * `audit_log`, must never quietly start shredding the audit trail.
 */
export function retentionWindows(
  env: Record<string, string | undefined>,
): RetentionWindows {
  return {
    messageDays: days(
      env.RETENTION_MESSAGE_DAYS,
      DEFAULT_RETENTION.messageDays,
    ),
    jobRunDays: days(env.RETENTION_JOB_RUN_DAYS, DEFAULT_RETENTION.jobRunDays),
    auditDays: days(env.RETENTION_AUDIT_DAYS, DEFAULT_RETENTION.auditDays),
    messengerDays: days(
      env.RETENTION_MESSENGER_DAYS,
      DEFAULT_RETENTION.messengerDays,
    ),
  };
}

function days(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < MIN_DAYS) return fallback;
  return parsed;
}
