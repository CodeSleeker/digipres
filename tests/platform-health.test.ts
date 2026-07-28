import { describe, it, expect } from "vitest";
import {
  isCronStale,
  minutesSince,
  CRON_STALE_AFTER_MINUTES,
  formatAge,
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
    expect(minutesSince(new Date(now - 90 * 60_000).toISOString(), now)).toBe(
      90,
    );
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
    expect(isCronStale(15)).toBe(false);
    expect(isCronStale(CRON_STALE_AFTER_MINUTES)).toBe(false); // boundary
    expect(isCronStale(CRON_STALE_AFTER_MINUTES + 1)).toBe(true);
  });

  it("tolerates a full day, since the jobs run daily on the free plan", () => {
    // A daily schedule must not read as "broken" for 23 of every 24 hours.
    expect(isCronStale(24 * 60)).toBe(false);
    expect(isCronStale(37 * 60)).toBe(true); // a run was genuinely missed
  });

  it("never reports negative age from clock skew", () => {
    expect(minutesSince(new Date(now + 60_000).toISOString(), now)).toBe(0);
  });
});

describe("age formatting for the health tiles", () => {
  it("says Never when the job has no recorded run", () => {
    expect(formatAge(null)).toBe("Never");
  });

  it("uses minutes, then hours, then days — never raw minutes for a daily job", () => {
    expect(formatAge(5)).toBe("5m ago");
    expect(formatAge(59)).toBe("59m ago");
    expect(formatAge(60)).toBe("1h ago");
    expect(formatAge(24 * 60)).toBe("24h ago"); // a normal daily gap
    expect(formatAge(72 * 60)).toBe("3d ago");
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
