"use client";

import { useEffect, type RefObject } from "react";
import { onScrollFrame } from "../lib/raf-scroll";

/** Below this width the shift is dropped: there is no room for it to read. */
const MIN_WIDTH = 760;

/**
 * The break section's background drift.
 *
 * The layer moves against the page by a fraction of a viewport, measured from
 * how far the section's centre is from the screen's centre — so the photograph
 * is at rest exactly when the section is, and drifts symmetrically either side.
 *
 * Only runs while the section is near the viewport. The observer is not an
 * optimisation detail: without it, reading the footer would still pay for a
 * transform write on a section thousands of pixels away, every frame.
 */
export function useParallax(
  sectionRef: RefObject<HTMLElement | null>,
  layerRef: RefObject<HTMLElement | null>,
  strength = 0.14,
) {
  useEffect(() => {
    const section = sectionRef.current;
    const layer = layerRef.current;
    if (!section || !layer) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stopScroll: (() => void) | undefined;

    const update = () => {
      if (window.innerWidth < MIN_WIDTH) {
        layer.style.transform = "";
        return;
      }
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      layer.style.transform = `translate3d(0,${(progress * strength * vh).toFixed(2)}px,0)`;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          stopScroll ??= onScrollFrame(update);
        } else {
          stopScroll?.();
          stopScroll = undefined;
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      stopScroll?.();
    };
  }, [sectionRef, layerRef, strength]);
}
