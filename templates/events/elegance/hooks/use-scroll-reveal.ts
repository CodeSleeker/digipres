"use client";

import { useEffect } from "react";

/**
 * Reveal-on-scroll. One IntersectionObserver watches every `.reveal` element
 * and adds `is-visible` as it enters the viewport, so the migrated markup stays
 * 1:1 with the source rather than growing a wrapper per element.
 *
 * Thresholds match the mockup's observer (`threshold: 0.1`, bottom margin
 * -80px) so elements arrive at the same point in the scroll they always did.
 *
 * Elements are unobserved once shown: the reveal is a one-way entrance, and
 * leaving them observed would keep the callback firing for the life of the page.
 *
 * IT ALSO WATCHES FOR NEW ONES, which is not a refinement but a correctness
 * fix. The event grid re-renders when a filter chip is clicked, and changing
 * which items are in the list makes React unmount the old cards and mount
 * fresh DOM nodes. A one-shot `querySelectorAll` on mount never sees those
 * nodes — and `.reveal` is `opacity: 0` until something adds `is-visible`, so
 * the section simply went blank. Filtering to "Debuts" showed an empty grid.
 *
 * The sweep is batched into a frame because a single React commit fires many
 * mutation records, and re-observing an element already being observed is a
 * no-op, so sweeping the whole document is cheap and idempotent.
 */
export function useScrollReveal() {
  useEffect(() => {
    const pending = () =>
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)");

    // No IntersectionObserver (or the visitor asked for less motion): show
    // everything immediately rather than leaving the page blank. Later
    // arrivals need the same treatment, which is why this branch watches too.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || !("IntersectionObserver" in window)) {
      const showAll = () =>
        pending().forEach((el) => el.classList.add("is-visible"));
      showAll();
      const watcher = new MutationObserver(showAll);
      watcher.observe(document.body, { childList: true, subtree: true });
      return () => watcher.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    );

    let queued = false;
    const sweep = () => {
      queued = false;
      pending().forEach((el) => observer.observe(el));
    };
    sweep();

    /*
     * `childList` only, deliberately: `is-visible` is an ATTRIBUTE change, and
     * watching attributes here would make this observer wake itself up on
     * every element it reveals.
     */
    const watcher = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sweep);
    });
    watcher.observe(document.body, { childList: true, subtree: true });

    return () => {
      watcher.disconnect();
      observer.disconnect();
    };
  }, []);
}
