"use client";

import { useEffect, useState } from "react";
import { onScrollFrame } from "../lib/raf-scroll";

/**
 * Returns `true` once the page is scrolled past 60px — used to toggle the
 * compact/opaque header state (mockup `.site-header.scrolled`).
 *
 * Coalesced to one check per frame. `setScrolled` with an unchanged boolean
 * bails out of re-rendering, so the steady-state cost is a single `scrollY`
 * read per painted frame.
 */
export function useHeaderScroll(threshold = 60): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(
    () => onScrollFrame(() => setScrolled(window.scrollY > threshold)),
    [threshold],
  );

  return scrolled;
}
