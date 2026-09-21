"use client";

import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled past the header's transparent state.
 *
 * The source added a class at `scrollY > 50` on every scroll event. Same
 * threshold here, but the listener is passive and the state only changes when
 * the boolean actually flips — a scroll handler that calls setState on every
 * frame re-renders the header sixty times a second to no effect.
 */
export function useNavScrolled(threshold = 50): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled((was) => {
        const now = window.scrollY > threshold;
        return was === now ? was : now;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
