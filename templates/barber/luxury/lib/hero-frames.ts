/**
 * Frame-sequence maths for the scroll-scrubbed hero.
 *
 * Pure and side-effect free so the scrub mapping is testable without a DOM —
 * the acceptance criteria (0 → f_001, 0.5 → f_033, 1 → f_064) are asserted in
 * tests/hero-frames.test.ts.
 */

/** Frames live in public/ — templates/ is not served by Next.js. */
export const FRAME_DIR = "/templates/barber-luxury/hero-frames";
export const FRAME_COUNT = 64;

/** The finished cut, shown as the static poster under reduced motion. */
export const FINAL_FRAME_INDEX = FRAME_COUNT - 1;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** `f_001` … `f_064` from a 0-based index. */
export function frameSrc(index: number): string {
  const clamped = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(index)));
  return `${FRAME_DIR}/f_${String(clamped + 1).padStart(3, "0")}.webp`;
}

/** Every frame path, in order — used to preload the whole set up front. */
export function allFrameSrcs(): string[] {
  return Array.from({ length: FRAME_COUNT }, (_, i) => frameSrc(i));
}

/**
 * Scroll progress (0–1) → the exact (fractional) frame the scrub is easing
 * toward. Fractional so the easing has something to interpolate against;
 * `frameSrc` rounds at the point of display.
 */
export function targetFrame(progress: number): number {
  return clamp01(progress) * (FRAME_COUNT - 1);
}

/**
 * How far the hero has been scrolled through, from its own geometry.
 * `trackHeight - viewportHeight` is the scrub runway: the surplus track height
 * that the sticky stage stays pinned for.
 */
export function scrollProgress(
  trackTop: number,
  trackHeight: number,
  viewportHeight: number,
): number {
  const runway = trackHeight - viewportHeight;
  if (runway <= 0) return 0;
  return clamp01(-trackTop / runway);
}
