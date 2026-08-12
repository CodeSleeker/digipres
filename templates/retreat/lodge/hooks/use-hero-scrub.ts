"use client";

import { useEffect, type RefObject } from "react";
import { clamp01, onScrollFrame, segment, smooth } from "../lib/raf-scroll";

/** Runway past the pinned screen, as a multiple of the viewport height. */
const RUNWAY = 1.45;
/** Where the hero hands the entrance over to the section beneath it. */
const HANDOFF = 0.72;
/** Below this width the scrub is replaced by the simplified mobile pass. */
const SCRUB_MIN_WIDTH = 900;

/**
 * The scroll-scrubbed hero, ported from the mockup's rAF loop.
 *
 * Scroll position drives progress directly (0 → 1) across the runway, with a
 * light lerp smoothing the steps a wheel arrives in. Pinning is native
 * `position: sticky`, so the page never stops scrolling normally — this only
 * READS where it is and paints transforms from that. Nothing is hijacked, and
 * a fast scroll can't outrun it.
 *
 * The stage's height and `data-scrub` are written to the DOM rather than kept
 * in state, deliberately: they are inputs to the very measurement that decides
 * them, and rendering a component to change a height you must then re-measure
 * costs a frame at exactly the moment there isn't one to spare.
 *
 * Under `prefers-reduced-motion` the hook does nothing at all: the stage stays
 * an ordinary full-height section, which is the same layout the phone gets.
 */
export function useHeroScrub({
  stageRef,
  mediaRef,
  veilRef,
  handoffSelector,
}: {
  /** The scroll runway (`.hero-scroll`). */
  stageRef: RefObject<HTMLDivElement | null>;
  /** The photograph layer, which scales and drifts. */
  mediaRef: RefObject<HTMLDivElement | null>;
  /** The overlay that deepens to hold type contrast. */
  veilRef: RefObject<HTMLDivElement | null>;
  /**
   * Elements to reveal as the pin releases, so the next section is already
   * there when the hero lets go rather than fading in behind it.
   */
  handoffSelector: string;
}) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const media = mediaRef.current;
    const veil = veilRef.current;

    const groups = new Map<string, HTMLElement>();
    stage
      .querySelectorAll<HTMLElement>("[data-hero-group]")
      .forEach((el) => groups.set(el.dataset.heroGroup ?? "", el));

    let scrub = false;
    let stageTop = 0;
    let runway = 1;
    let target = 0;
    let current = 0;
    let frame = 0;
    let handedOff = false;

    /** Layout reads live here only, so the render pass never touches geometry. */
    const measure = () => {
      const vh = window.innerHeight;
      scrub = window.innerWidth >= SCRUB_MIN_WIDTH;

      stage.dataset.scrub = scrub ? "on" : "off";
      stage.style.height = scrub ? `calc(100svh + ${RUNWAY * 100}vh)` : "";

      const rect = stage.getBoundingClientRect();
      stageTop = rect.top + window.scrollY;
      /*
       * Pinned: the runway is the scroll the pin actually consumes.
       *
       * Not pinned: nine tenths of the STAGE, not of the viewport. The mockup
       * wrote `vh * 0.9` because on its own phone the hero was one screen tall,
       * so the two were the same number and it meant "retire the copy over
       * roughly the height of the hero". They stop being the same the moment
       * the hero grows past the viewport — which it does on a 667px phone,
       * where this stack runs ~830px. Measured against `vh` the copy finished
       * fading with 230px of hero still on screen, leaving a blank photograph
       * where the heading had been. Measured against the stage, it lands as the
       * hero leaves, which is what the mockup's figure meant.
       */
      runway = Math.max(scrub ? rect.height - vh : rect.height * 0.9, 1);
    };

    const read = () => {
      target = clamp01((window.scrollY - stageTop) / runway);
    };

    /**
     * Move one scrub group. Faded-out content leaves the pointer and the tab
     * order entirely — otherwise the hero's buttons stay clickable and
     * focusable underneath the section that has replaced them.
     */
    const setGroup = (
      el: HTMLElement | undefined,
      y: number,
      scale: number,
      opacity: number,
    ) => {
      if (!el) return;
      el.style.transform =
        `translate3d(0,${y.toFixed(2)}px,0)` +
        (scale === 1 ? "" : ` scale(${scale.toFixed(4)})`);
      const o = clamp01(opacity);
      el.style.opacity = o.toFixed(3);
      const gone = o < 0.06;
      el.style.pointerEvents = gone ? "none" : "";
      el.style.visibility = gone ? "hidden" : "";
    };

    const render = (p: number) => {
      const vh = window.innerHeight;
      const mobile = !scrub;

      // Image: slow scale with a light vertical drift.
      if (media) {
        const scale = 1 + (mobile ? 0.045 : 0.08) * p;
        const shift = -(mobile ? 0.045 : 0.07) * vh * p;
        media.style.transform = `translate3d(0,${shift.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
      }

      // Overlay deepens gradually to hold type contrast.
      if (veil) {
        veil.style.opacity = ((mobile ? 0.2 : 0.32) * smooth(p)).toFixed(3);
      }

      // The eyebrow leaves first.
      let f = segment(p, 0, mobile ? 0.42 : 0.3);
      setGroup(groups.get("eyebrow"), -22 * smooth(f), 1, 1 - f);

      // Paragraph and buttons fade earlier than the headline.
      f = segment(p, mobile ? 0.08 : 0.05, mobile ? 0.62 : 0.45);
      setGroup(groups.get("copy"), -30 * smooth(f), 1, 1 - f);

      // The headline drifts up, holds, then softens late.
      const rise = segment(p, 0, mobile ? 1 : 0.92);
      const late = segment(p, mobile ? 0.5 : 0.6, 1);
      setGroup(
        groups.get("title"),
        -(mobile ? 34 : 62) * smooth(rise),
        1,
        1 - 0.85 * late,
      );

      // The location gains presence towards the end of the scrub.
      const gain = smooth(segment(p, mobile ? 0.2 : 0.35, mobile ? 0.7 : 0.85));
      const place = groups.get("place");
      setGroup(
        place,
        -7 * gain,
        1 + 0.05 * gain,
        mobile ? 1 - segment(p, 0.7, 1) : 0.72 + 0.28 * gain,
      );
      place?.style.setProperty("--lodge-place", gain.toFixed(3));

      // The scroll cue retires immediately.
      f = segment(p, 0, 0.22);
      setGroup(groups.get("cue"), 10 * f, 1, 1 - f);

      // Hand off to the next section before the pin releases.
      if (scrub && !handedOff && p >= HANDOFF) {
        handedOff = true;
        document
          .querySelectorAll<HTMLElement>(handoffSelector)
          .forEach((el) => el.classList.add("is-visible"));
      }
    };

    const tick = () => {
      const delta = target - current;
      // Close enough to be indistinguishable: settle exactly and stop the loop
      // rather than converging forever on a page nobody is scrolling.
      if (Math.abs(delta) < 0.0006) {
        current = target;
        render(current);
        frame = 0;
        return;
      }
      current += delta * 0.18;
      render(current);
      frame = requestAnimationFrame(tick);
    };

    const pulse = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    measure();
    read();
    current = target;
    render(current);

    const stopScroll = onScrollFrame(() => {
      read();
      pulse();
    });

    // Re-measure after the viewport settles, then repaint from where the page
    // actually is — a resize mid-scrub otherwise leaves the hero painted for
    // the old geometry.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        read();
        current = target;
        render(current);
      }, 140);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stopScroll();
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stageRef, mediaRef, veilRef, handoffSelector]);
}
