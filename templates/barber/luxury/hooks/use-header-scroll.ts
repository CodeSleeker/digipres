"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` once the page is scrolled past 60px — used to toggle the
 * compact/opaque header state (mockup `.site-header.scrolled`).
 */
export function useHeaderScroll(threshold = 60): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
