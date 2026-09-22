import { describe, it, expect } from "vitest";
import { formatHours } from "@/lib/website/build-profile";
import type { DayHours } from "@/types/business-entity";

/**
 * Opening hours, as a reader sees them.
 *
 * The display only — the JSON-LD builds from `business.hours` directly, so
 * nothing here affects what a search engine is told.
 */

const open = (day: number, o = "09:00", c = "17:00"): DayHours => ({
  day: day as DayHours["day"],
  closed: false,
  open: o,
  close: c,
});
const shut = (day: number): DayHours => ({
  day: day as DayHours["day"],
  closed: true,
  open: null,
  close: null,
});

/** Sunday closed, Monday to Saturday nine to five — the common shape. */
const ordinaryWeek = [shut(0), ...[1, 2, 3, 4, 5, 6].map((d) => open(d))];

describe("formatHours", () => {
  it("collapses a run of identical days into one line", () => {
    // Was seven near-identical lines, six of them saying the same thing. The
    // approved design writes it as one: "Mon–Sat: 9AM – 6PM".
    expect(formatHours(ordinaryWeek)).toEqual([
      "Mon–Sat: 9 AM – 5 PM",
      "Sun: Closed",
    ]);
  });

  it("reads Monday first and Sunday last", () => {
    // Stored `day` is 0=Sunday because that is what the date APIs use, but
    // nobody prints a week that opens on Sunday.
    const [first] = formatHours(ordinaryWeek);
    expect(first!.startsWith("Mon")).toBe(true);
  });

  it("drops the zero minutes and keeps real ones", () => {
    expect(formatHours([open(1, "09:00", "17:30")])).toEqual([
      "Mon: 9 AM – 5:30 PM",
    ]);
  });

  it("NEVER bridges a day the record does not mention", () => {
    // The dangerous case. Monday and Wednesday stored, Tuesday absent —
    // "Mon–Wed" would claim an opening time for a day nobody gave, and the
    // customer who turns up on Tuesday is the one who finds out.
    expect(formatHours([open(1), open(3)])).toEqual([
      "Mon: 9 AM – 5 PM",
      "Wed: 9 AM – 5 PM",
    ]);
  });

  it("breaks a run where the times differ", () => {
    expect(
      formatHours([open(1), open(2), open(3, "10:00", "14:00"), open(4)]),
    ).toEqual([
      "Mon–Tue: 9 AM – 5 PM",
      "Wed: 10 AM – 2 PM",
      "Thu: 9 AM – 5 PM",
    ]);
  });

  it("groups closed days too", () => {
    expect(
      formatHours([...[1, 2, 3, 4, 5].map((d) => open(d)), shut(6), shut(0)]),
    ).toEqual(["Mon–Fri: 9 AM – 5 PM", "Sat–Sun: Closed"]);
  });

  it("treats a day with no times as closed", () => {
    // `closed` false but the times missing is a half-filled record, not an
    // instruction to print "undefined – undefined".
    expect(
      formatHours([{ day: 1, closed: false, open: null, close: null }]),
    ).toEqual(["Mon: Closed"]);
  });

  it("renders nothing at all when there are no hours", () => {
    // Empty means no HOURS card, rather than an empty one.
    expect(formatHours([])).toEqual([]);
  });
});
