import { describe, it, expect } from "vitest";
import {
  isCronStale,
  minutesSince,
  CRON_STALE_AFTER_MINUTES,
} from "@/lib/platform/health";
import {
  bucketByMonth,
  bucketRangeStart,
  monthBuckets,
} from "@/lib/analytics/buckets";

describe("cron staleness", () => {
  const now = Date.UTC(2026, 6, 23, 12, 0, 0);

  it("measures minutes since the last run", () => {
    expect(minutesSince(new Date(now - 5 * 60_000).toISOString(), now)).toBe(5);
    expect(minutesSince(new Date(now - 90 * 60_000).toISOString(), now)).toBe(90);
  });

  it("returns null when it has never run", () => {
    expect(minutesSince(null, now)).toBeNull();
    expect(minutesSince(undefined, now)).toBeNull();
    expect(minutesSince("not-a-date", now)).toBeNull();
  });

  it("treats NEVER RUN as stale — the state of a platform with no scheduler", () => {
    expect(isCronStale(null)).toBe(true);
  });

  it("is healthy inside the window and stale past it", () => {
    expect(isCronStale(15)).toBe(false); // one cron tick
    expect(isCronStale(CRON_STALE_AFTER_MINUTES)).toBe(false); // boundary
    expect(isCronStale(CRON_STALE_AFTER_MINUTES + 1)).toBe(true);
  });

  it("never reports negative age from clock skew", () => {
    expect(minutesSince(new Date(now + 60_000).toISOString(), now)).toBe(0);
  });
});

describe("month bucketing (shared by tenant + platform analytics)", () => {
  const now = new Date(2026, 6, 15); // July 2026

  it("returns the last N months, oldest first", () => {
    const buckets = monthBuckets(6, now);
    expect(buckets).toHaveLength(6);
    expect(buckets.at(-1)!.key).toBe("2026-6"); // current month last
    expect(buckets[0]!.key).toBe("2026-1");
  });

  it("counts dates into their month, ignoring anything outside the range", () => {
    const buckets = monthBuckets(3, now); // May, Jun, Jul
    const series = bucketByMonth(buckets, [
      new Date(2026, 6, 2).toISOString(),
      new Date(2026, 6, 20).toISOString(),
      new Date(2026, 5, 9).toISOString(),
      new Date(2020, 0, 1).toISOString(), // far outside → ignored
    ]);
    expect(series.map((p) => p.value)).toEqual([0, 1, 2]);
  });

  it("starts the range at the first day of the oldest bucket", () => {
    const start = new Date(bucketRangeStart(3, now));
    expect(start.getMonth()).toBe(4); // May
    expect(start.getDate()).toBe(1);
  });
});
