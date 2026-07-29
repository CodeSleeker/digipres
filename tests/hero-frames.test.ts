import { describe, it, expect } from "vitest";
import {
  FRAME_COUNT,
  FINAL_FRAME_INDEX,
  allFrameSrcs,
  clamp01,
  frameSrc,
  scrollProgress,
  targetFrame,
} from "@/templates/barber/luxury/lib/hero-frames";

/**
 * The scrub mapping for the pinned hero. These are the stated acceptance
 * criteria, plus the edge cases that would otherwise only show up as a visual
 * glitch mid-scroll.
 */

/** progress → the file actually displayed. */
const shownAt = (progress: number) => frameSrc(targetFrame(progress));

describe("acceptance criteria: progress → frame", () => {
  it("0 → f_001, 0.5 → f_033, 1 → f_064", () => {
    expect(shownAt(0)).toBe("/templates/barber-luxury/hero-frames/f_001.webp");
    expect(shownAt(0.5)).toBe(
      "/templates/barber-luxury/hero-frames/f_033.webp",
    );
    expect(shownAt(1)).toBe("/templates/barber-luxury/hero-frames/f_064.webp");
  });

  it("advances monotonically across the whole track", () => {
    let previous = -1;
    for (let step = 0; step <= 100; step++) {
      const index = Math.round(targetFrame(step / 100));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
    expect(previous).toBe(FINAL_FRAME_INDEX);
  });
});

describe("frame paths", () => {
  it("serves from public/, not templates/ (templates isn't web-served)", () => {
    expect(
      frameSrc(0).startsWith("/templates/barber-luxury/hero-frames/"),
    ).toBe(true);
  });

  it("zero-pads to three digits", () => {
    expect(frameSrc(0)).toContain("f_001.webp");
    expect(frameSrc(8)).toContain("f_009.webp");
    expect(frameSrc(62)).toContain("f_063.webp");
  });

  it("clamps out-of-range indices instead of producing a 404 path", () => {
    expect(frameSrc(-5)).toContain("f_001.webp");
    expect(frameSrc(999)).toContain("f_064.webp");
  });

  it("lists every frame exactly once, in order", () => {
    const all = allFrameSrcs();
    expect(all).toHaveLength(FRAME_COUNT);
    expect(new Set(all).size).toBe(FRAME_COUNT);
    expect(all[0]).toContain("f_001.webp");
    expect(all[FRAME_COUNT - 1]).toContain("f_064.webp");
  });
});

describe("scrollProgress", () => {
  const TRACK = 3200; // 320vh at a 1000px viewport
  const VIEW = 1000;
  const RUNWAY = TRACK - VIEW;

  it("is 0 before the track is reached and 1 once fully scrubbed", () => {
    expect(scrollProgress(0, TRACK, VIEW)).toBe(0);
    expect(scrollProgress(-RUNWAY, TRACK, VIEW)).toBe(1);
  });

  it("is 0.5 at the midpoint of the runway", () => {
    expect(scrollProgress(-RUNWAY / 2, TRACK, VIEW)).toBeCloseTo(0.5, 5);
  });

  it("clamps past both ends rather than over-running the sequence", () => {
    expect(scrollProgress(500, TRACK, VIEW)).toBe(0); // still below
    expect(scrollProgress(-99999, TRACK, VIEW)).toBe(1); // scrolled past
  });

  it("returns 0 when there is no runway, instead of dividing by zero", () => {
    // Reduced motion collapses the track to exactly one viewport.
    expect(scrollProgress(0, VIEW, VIEW)).toBe(0);
    expect(Number.isNaN(scrollProgress(-10, VIEW, VIEW))).toBe(false);
  });
});

describe("clamp01", () => {
  it("bounds the range and never lets NaN through to the frame maths", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
