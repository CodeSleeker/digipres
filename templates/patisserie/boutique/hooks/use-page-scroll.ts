"use client";

import { useEffect, useState } from "react";

export interface PageScroll {
  /** 0–1: how far down the document the reader is. Drives the progress rule. */
  progress: number;
  /** Past the first 24px — the header compacts and takes on its backdrop. */
  stuck: boolean;
}

/**
 * Document scroll state, sampled at most once per painted frame.
 *
 * Both values come from ONE listener because the mockup reads them in one
 * handler and because they are read from the same layout: splitting them would
 * mean two `scrollHeight` reads per frame, each of which can force a reflow.
 */
export function usePageScroll(): PageScroll {
  const [state, setState] = useState<PageScroll>({ progress: 0, stuck: false });

  useEffect(() => {
    let queued = false;

    const measure = () => {
      queued = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(y / max, 1) : 0;
      const stuck = y > 24;
      // Bail out of the re-render when nothing a viewer can see has changed.
      setState((prev) =>
        prev.stuck === stuck && Math.abs(prev.progress - progress) < 0.002
          ? prev
          : { progress, stuck },
      );
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return state;
}
