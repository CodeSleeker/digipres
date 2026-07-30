/**
 * Run `handler` at most once per animation frame, driven by scroll.
 *
 * A `scroll` listener can fire many times between two paints — on a touch
 * device during a flick, far more than 60 times a second. Any handler that
 * reads layout (`getBoundingClientRect`, `offsetHeight`) and then writes style
 * is doing a forced synchronous layout on each of those calls, on the same
 * main thread the browser needs to move the page. That is what "laggy scroll"
 * usually is.
 *
 * Coalescing into one rAF callback means the work happens once per frame, at
 * the moment the browser is about to paint anyway.
 *
 * Calls `handler` once immediately so the initial state is correct, and
 * returns a cleanup that removes the listener and cancels a pending frame.
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
