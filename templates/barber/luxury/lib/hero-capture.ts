/**
 * Pure maths for the video-scrubbed hero.
 *
 * Kept free of DOM/canvas so the two things most likely to be subtly wrong —
 * which sample slots a presented frame covers, and the cover-fit rectangle —
 * are unit-testable. See tests/hero-capture.test.ts.
 */

/** Capture budget. ImageBitmaps are uncompressed: w × h × 4 bytes each. */
export const DESKTOP_SAMPLES = 60;
export const MOBILE_SAMPLES = 40;
export const DESKTOP_RESIZE_WIDTH = 1024;
export const MOBILE_RESIZE_WIDTH = 640;

/** Played once at this rate while sampling, so capture takes ~duration/3. */
export const CAPTURE_PLAYBACK_RATE = 3;
/** Give up on capture and fall back to the WebP stills after this long. */
export const CAPTURE_WATCHDOG_MS = 9_000;
/** Per-step guard for the seek-based fallback. */
export const SEEK_TIMEOUT_MS = 400;
/** Retina is enough; beyond 2 the bitmap cost stops paying for itself. */
export const MAX_DPR = 2;

export interface CaptureBudget {
  sampleCount: number;
  resizeWidth: number;
}

/** Mobile captures fewer, smaller frames — same technique, a third the memory. */
export function captureBudget(viewportWidth: number): CaptureBudget {
  return viewportWidth <= 768
    ? { sampleCount: MOBILE_SAMPLES, resizeWidth: MOBILE_RESIZE_WIDTH }
    : { sampleCount: DESKTOP_SAMPLES, resizeWidth: DESKTOP_RESIZE_WIDTH };
}

/**
 * The last sample slot a frame presented at `mediaTime` has reached.
 *
 * At 3× playback a single presented frame can straddle several slots, so the
 * caller fills everything from its cursor up to this index with that frame.
 * Leaving the skipped slots empty is what produces holes — black flashes
 * mid-scrub — which is the bug this exists to prevent.
 */
export function slotForTime(
  mediaTime: number,
  duration: number,
  sampleCount: number,
): number {
  if (!(duration > 0) || sampleCount <= 0) return 0;
  const ratio = mediaTime / duration;
  const slot = Math.floor(ratio * sampleCount);
  return Math.min(sampleCount - 1, Math.max(0, slot));
}

/** Evenly spaced sample timestamps, for the seek-based fallback. */
export function sampleTimes(duration: number, sampleCount: number): number[] {
  if (!(duration > 0) || sampleCount <= 0) return [];
  return Array.from(
    { length: sampleCount },
    // Mid-slot, so a seek never lands exactly on a boundary keyframe.
    (_, i) => ((i + 0.5) / sampleCount) * duration,
  );
}

export interface CoverRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Cover-fit with a vertical bias — canvas has no `object-fit`, so the
 * equivalent of `object-position: center 28%` is computed here. 0.28 keeps
 * faces in frame instead of centring on the chest.
 */
export function coverRect(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  verticalBias = 0.28,
): CoverRect {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { dx: 0, dy: 0, dw: canvasWidth, dh: canvasHeight };
  }
  const scale = Math.max(
    canvasWidth / sourceWidth,
    canvasHeight / sourceHeight,
  );
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  return {
    dx: (canvasWidth - dw) / 2,
    dy: (canvasHeight - dh) * verticalBias,
    dw,
    dh,
  };
}

/** Scroll progress (0–1) → which captured sample to paint. */
export function frameIndexFor(progress: number, sampleCount: number): number {
  if (sampleCount <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.round(clamped * (sampleCount - 1));
}
