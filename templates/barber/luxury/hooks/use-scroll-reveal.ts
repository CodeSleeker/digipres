"use client";

import { useEffect } from "react";

/**
 * Reveal-on-scroll. Mirrors the mockup: a single IntersectionObserver watches
 * every `.reveal` element and adds `is-visible` once it enters the viewport.
 * Kept as a global observer (rather than per-element wrappers) so the migrated
 * markup stays 1:1 with the source.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
