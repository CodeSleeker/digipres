/**
 * Run `handler` at most once per animation frame, driven by scroll.
 *
 * The mockup drives its whole page from one passive scroll listener and one
 * rAF, with every layout read batched inside it — this is that loop. See the
 * long note on the barber template's copy (templates/barber/luxury/lib) for why
 * a raw scroll handler that reads layout is the usual cause of a page that
 * scrolls badly.
 *
 * Calls `handler` once immediately so the initial state is correct, and returns
 * a cleanup that removes the listener and cancels a pending frame.
 */
export function onScrollFrame(handler: () => void): () => void {
  let frame = 0;

  const run = () => {
    frame = 0;
    handler();
  };

  const onScroll = () => {
    // Already scheduled for this frame — drop the extra events on the floor.
    if (frame) return;
    frame = requestAnimationFrame(run);
  };

  handler();
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

/** Clamp to 0–1. */
export const clamp01 = (value: number) =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** Progress of `p` across the segment `a → b`, clamped. */
export const segment = (p: number, a: number, b: number) =>
  clamp01((p - a) / (b - a));

/** Smoothstep: eases both ends of a 0–1 ramp. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
