"use client";

import { useEffect, useState } from "react";
import { onScrollFrame } from "../lib/raf-scroll";

/** Fallback threshold when there is no hero stage to measure against. */
const FALLBACK = 40;

/**
 * Whether the header has left the hero and needs its own background.
 *
 * The threshold is not a fixed offset: the header sits over a full-bleed
 * photograph in ivory-on-dark, and it has to change to ink-on-ivory just BEFORE
 * that photograph leaves — a moment that depends on how long the hero's scroll
 * runway is. So it is measured from the stage, exactly as the mockup does.
 *
 * The stage is located by selector rather than passed as a ref because the hero
 * is not this component's child; the two are siblings under the template root,
 * and threading a ref between them through context would be more machinery than
 * the one number is worth.
 */
export function useHeaderScroll(stageSelector: string): boolean {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let threshold = FALLBACK;

    const measure = () => {
      const stage = document.querySelector<HTMLElement>(stageSelector);
      if (!stage) {
        threshold = FALLBACK;
        return;
      }
      const vh = window.innerHeight;
      const rect = stage.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // A third of a screen before the pin releases, so the change has landed
      // by the time the ivory section arrives under the header.
      threshold = Math.max(FALLBACK, top + rect.height - vh - vh * 0.35);
    };

    /*
     * Measured a frame late, on purpose.
     *
     * The stage's height is written by the hero's own effect, and this
     * component mounts BEFORE the hero — so measuring during this effect would
     * read the runway as zero and stick the header immediately. One frame is
     * enough for every effect on the page to have run.
     */
    const first = requestAnimationFrame(measure);

    const stopScroll = onScrollFrame(() => {
      setStuck(window.scrollY > threshold);
    });

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        setStuck(window.scrollY > threshold);
      }, 140);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(first);
      stopScroll();
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, [stageSelector]);

  return stuck;
}
