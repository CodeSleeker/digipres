/**
 * Month bucketing for time-series charts, shared by the tenant analytics and
 * the platform-wide analytics so both label and align periods identically.
 */
export interface MonthBucket {
  /** "<year>-<monthIndex>", the join key. */
  key: string;
  /** Short display label, e.g. "Mar". */
  label: string;
}

export interface TimePoint {
  label: string;
  value: number;
}

/** The last `months` months, oldest first, ending with the current month. */
export function monthBuckets(months: number, now: Date = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return out;
}

/** The bucket key an ISO timestamp falls into. */
export function bucketKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Count ISO timestamps into the given buckets (anything outside is ignored). */
export function bucketByMonth(
  buckets: MonthBucket[],
  isoDates: string[],
): TimePoint[] {
  const counts = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  for (const iso of isoDates) {
    const key = bucketKey(iso);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
}

/** Start of the earliest bucket — the `since` bound for a query. */
export function bucketRangeStart(months: number, now: Date = new Date()): string {
  return new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  ).toISOString();
}
