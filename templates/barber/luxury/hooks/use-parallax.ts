"use client";

import { useEffect, type RefObject } from "react";

/**
 * Hero background parallax (desktop / fine-pointer only), matching the mockup:
 * transform = scale(1.05) translateY(scrollY * speed).
 * Disabled on touch devices exactly as the source does.
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  speed = 0.3,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isTouch = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    ).matches;
    if (isTouch) return;

    const onScroll = () => {
      el.style.transform = `scale(1.05) translateY(${window.scrollY * speed}px)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref, speed]);
}
