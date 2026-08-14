import { describe, it, expect } from "vitest";
import { DEFAULT_RETENTION, retentionWindows } from "@/lib/jobs/retention";

/**
 * Retention windows come from the environment, so a typo in a deploy setting is
 * a realistic way to destroy data. These assert the parser fails toward keeping
 * data, never toward deleting it.
 */
describe("retention window configuration", () => {
  it("uses the defaults when nothing is set", () => {
    expect(retentionWindows({})).toEqual(DEFAULT_RETENTION);
  });

  it("keeps the audit trail far longer than operational data", () => {
    // Accountability outlives operations — deliberately, not incidentally.
    expect(DEFAULT_RETENTION.auditDays).toBeGreaterThan(
      DEFAULT_RETENTION.messageDays,
    );
  });

  it("accepts valid overrides", () => {
    expect(
      retentionWindows({
        RETENTION_MESSAGE_DAYS: "30",
        RETENTION_JOB_RUN_DAYS: "14",
        RETENTION_AUDIT_DAYS: "1095",
        RETENTION_MESSENGER_DAYS: "45",
      }),
    ).toEqual({
      messageDays: 30,
      jobRunDays: 14,
      auditDays: 1095,
      messengerDays: 45,
    });
  });

  /**
   * Messenger transcripts are other people's private conversations — the most
   * sensitive rows the platform holds — so they must never default to being
   * kept longer than ordinary operational data.
   */
  it("does not keep Messenger transcripts longer than operational data", () => {
    expect(DEFAULT_RETENTION.messengerDays).toBeLessThanOrEqual(
      DEFAULT_RETENTION.messageDays,
    );
    expect(DEFAULT_RETENTION.messengerDays).toBeLessThan(
      DEFAULT_RETENTION.auditDays,
    );
  });

  it("falls back rather than shortening the Messenger window", () => {
    expect(
      retentionWindows({ RETENTION_MESSENGER_DAYS: "0" }).messengerDays,
    ).toBe(DEFAULT_RETENTION.messengerDays);
  });

  it.each([
    ["empty", ""],
    ["not a number", "ninety"],
    ["zero", "0"],
    ["negative", "-30"],
    ["fractional", "1.5"],
  ])("falls back rather than shortening the window: %s", (_label, value) => {
    const windows = retentionWindows({
      RETENTION_MESSAGE_DAYS: value,
      RETENTION_AUDIT_DAYS: value,
    });
    expect(windows.messageDays).toBe(DEFAULT_RETENTION.messageDays);
    expect(windows.auditDays).toBe(DEFAULT_RETENTION.auditDays);
  });

  it("treats each window independently", () => {
    const windows = retentionWindows({
      RETENTION_MESSAGE_DAYS: "30",
      RETENTION_AUDIT_DAYS: "oops",
    });
    expect(windows.messageDays).toBe(30);
    expect(windows.auditDays).toBe(DEFAULT_RETENTION.auditDays); // unaffected
  });
});
