"use client";

import { useEffect, useState } from "react";

/**
 * Which nav target is currently in view, as a `#hash`.
 *
 * Observes the sections the nav actually links to, with a rootMargin that
 * narrows the viewport to a band across its middle — so the "current" section
 * is the one a reader is looking at, not merely the one whose top edge has
 * scrolled past. Returns "" until one qualifies.
 */
export function useActiveSection(hrefs: string[]): string {
  const [active, setActive] = useState("");

  useEffect(() => {
    // Only in-page anchors have a section to observe.
    const targets = hrefs
      .filter((href) => href.startsWith("#") && href.length > 1)
      .map((href) => document.querySelector<HTMLElement>(href))
      .filter((el): el is HTMLElement => el !== null);

    if (!targets.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // Joined so a new array of the same hrefs doesn't re-subscribe every render.
  }, [hrefs.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}
