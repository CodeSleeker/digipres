"use client";

import { useEffect } from "react";

/**
 * Reveal-on-scroll. One IntersectionObserver watches every `.reveal` element
 * and adds `is-visible` as it enters the viewport, so the migrated markup stays
 * 1:1 with the source rather than growing a wrapper per element.
 *
 * `.reveal-img` frames carry BOTH classes in the source and here: the same flag
 * drives the fade and the image curtain, which must land together.
 *
 * Elements are unobserved once shown: the reveal is a one-way entrance, and
 * leaving them observed would keep the callback firing for the life of the page.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");

    // No IntersectionObserver (or the visitor asked for less motion): show
    // everything immediately rather than leaving the page blank.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      // The mockup's thresholds: a little into the viewport, and not counted
      // until the element is meaningfully on screen.
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
