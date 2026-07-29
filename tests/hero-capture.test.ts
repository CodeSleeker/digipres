import { describe, it, expect } from "vitest";
import {
  DESKTOP_SAMPLES,
  MOBILE_SAMPLES,
  DESKTOP_RESIZE_WIDTH,
  MOBILE_RESIZE_WIDTH,
  captureBudget,
  coverRect,
  frameIndexFor,
  sampleTimes,
  slotForTime,
} from "@/templates/barber/luxury/lib/hero-capture";

/**
 * The video-scrubbed hero's maths. These cover the two things most likely to be
 * subtly wrong: which slots a presented frame covers (holes here show as black
 * flashes mid-scrub) and the cover-fit rectangle (canvas has no object-fit).
 */

describe("capture budget", () => {
  it("caps memory: fewer, smaller frames on mobile", () => {
    expect(captureBudget(1920)).toEqual({
      sampleCount: DESKTOP_SAMPLES,
      resizeWidth: DESKTOP_RESIZE_WIDTH,
    });
    expect(captureBudget(390)).toEqual({
      sampleCount: MOBILE_SAMPLES,
      resizeWidth: MOBILE_RESIZE_WIDTH,
    });
  });

  it("treats exactly 768px as mobile", () => {
    expect(captureBudget(768).sampleCount).toBe(MOBILE_SAMPLES);
    expect(captureBudget(769).sampleCount).toBe(DESKTOP_SAMPLES);
  });

  it("keeps the uncompressed footprint bounded", () => {
    // ImageBitmaps are w × h × 4 bytes; 226 source frames at full res is ~830MB.
    const { sampleCount, resizeWidth } = captureBudget(1920);
    const bytes = sampleCount * resizeWidth * (resizeWidth * (9 / 16)) * 4;
    expect(bytes / 1024 ** 2).toBeLessThan(200); // MB
  });
});

describe("slotForTime — the straddling rule", () => {
  const DURATION = 9.4;
  const N = 60;

  it("maps the ends correctly", () => {
    expect(slotForTime(0, DURATION, N)).toBe(0);
    expect(slotForTime(DURATION, DURATION, N)).toBe(N - 1);
  });

  it("advances through the middle", () => {
    expect(slotForTime(DURATION / 2, DURATION, N)).toBe(30);
  });

  it("clamps past the end rather than writing out of bounds", () => {
    // At 3x, a late frame can report a mediaTime beyond the nominal duration.
    expect(slotForTime(DURATION * 2, DURATION, N)).toBe(N - 1);
    expect(slotForTime(-1, DURATION, N)).toBe(0);
  });

  it("never divides by zero on a video with no duration yet", () => {
    expect(slotForTime(1, 0, N)).toBe(0);
    expect(slotForTime(1, Number.NaN, N)).toBe(0);
  });

  it("a single presented frame can straddle several slots", () => {
    // This is the whole reason the caller fills a RANGE: at 3x playback, gaps
    // between presented frames span multiple slots. Leaving them empty is what
    // produces black flashes mid-scrub.
    const first = slotForTime(0.05, DURATION, N);
    const next = slotForTime(0.45, DURATION, N);
    expect(next - first).toBeGreaterThan(1);
  });
});

describe("sampleTimes (seek fallback)", () => {
  it("returns one timestamp per slot, inside the clip", () => {
    const times = sampleTimes(9.4, 60);
    expect(times).toHaveLength(60);
    expect(times[0]).toBeGreaterThan(0);
    expect(times[59]).toBeLessThan(9.4);
  });

  it("is strictly increasing", () => {
    const times = sampleTimes(9.4, 60);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  it("returns nothing for an unusable duration", () => {
    expect(sampleTimes(0, 60)).toEqual([]);
    expect(sampleTimes(Number.NaN, 60)).toEqual([]);
  });
});

describe("coverRect — object-fit: cover with a 28% vertical bias", () => {
  it("fills the canvas with no letterboxing", () => {
    const { dx, dy, dw, dh } = coverRect(1280, 720, 800, 900);
    expect(dw).toBeGreaterThanOrEqual(800);
    expect(dh).toBeGreaterThanOrEqual(900);
    expect(dx).toBeLessThanOrEqual(0); // overflow is cropped, not inset
    expect(dy).toBeLessThanOrEqual(0);
  });

  it("centres horizontally but biases the crop upward", () => {
    // Wide source into a tall canvas: vertical overflow is cropped 28/72,
    // keeping faces in frame rather than centring on the chest.
    const { dx, dy, dh } = coverRect(1280, 720, 400, 800);
    expect(dx).toBeCloseTo((400 - 1422.2) / 2, 0);
    expect(dy).toBeCloseTo((800 - dh) * 0.28, 5);
  });

  it("is a no-op fill for a degenerate source", () => {
    expect(coverRect(0, 0, 300, 200)).toEqual({
      dx: 0,
      dy: 0,
      dw: 300,
      dh: 200,
    });
  });
});

describe("frameIndexFor", () => {
  it("maps progress 1:1 across the captured set", () => {
    expect(frameIndexFor(0, 60)).toBe(0);
    expect(frameIndexFor(0.5, 60)).toBe(30);
    expect(frameIndexFor(1, 60)).toBe(59);
  });

  it("adapts when the fallback supplies a different count", () => {
    // The WebP fallback has 64 stills, not 60 samples.
    expect(frameIndexFor(1, 64)).toBe(63);
    expect(frameIndexFor(1, 40)).toBe(39);
  });

  it("produces distinct frames at the acceptance checkpoints", () => {
    const seen = [0, 0.35, 0.7, 1].map((p) => frameIndexFor(p, 60));
    expect(new Set(seen).size).toBe(4);
  });

  it("clamps rather than indexing out of bounds", () => {
    expect(frameIndexFor(-1, 60)).toBe(0);
    expect(frameIndexFor(2, 60)).toBe(59);
    expect(frameIndexFor(0.5, 0)).toBe(0);
  });
});
