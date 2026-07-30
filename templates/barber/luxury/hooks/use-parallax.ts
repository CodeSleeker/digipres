"use client";

import { useEffect, type RefObject } from "react";
import { onScrollFrame } from "../lib/raf-scroll";

/**
 * Hero background parallax (desktop / fine-pointer only). Disabled on touch
 * devices exactly as the mockup does.
 *
 * Writes the standalone `translate` property rather than `transform`. The
 * mockup combined both into one `transform` string, but under Tailwind v4 the
 * element's `scale-[1.05]` / `group-hover:scale-100` compile to the separate
 * `scale` property — and `scale` COMPOSES with `transform`, so a
 * `transform: scale(1.05) …` here would multiply the two (1.05 × 1.05) and
 * flatten the hover zoom-out. Owning only `translate` keeps the channels
 * independent; `transition-transform` covers all four in v4, so the hover
 * transition still applies.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, speed = 0.3) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isTouch = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    ).matches;
    if (isTouch) return;

    return onScrollFrame(() => {
      el.style.translate = `0 ${window.scrollY * speed}px`;
    });
  }, [ref, speed]);
}
