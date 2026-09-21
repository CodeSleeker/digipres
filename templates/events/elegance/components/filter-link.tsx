"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * The event a category card fires at the showcase grid.
 *
 * `EventCategoryCard.filter` promises that clicking a card lands on the grid
 * already narrowed to that category. The two sections are far apart in the
 * tree and only one of them holds state, so rather than lift the filter into
 * a provider that wraps the whole page for one interaction, the card
 * announces the category and the grid listens.
 *
 * The anchor still navigates: the browser scrolls to #events on its own, and
 * with the event unheard — no script, an older browser, the grid not
 * rendered — the reader simply arrives at the unfiltered grid, which is the
 * correct fallback rather than a broken link.
 */
export const EVENT_FILTER = "elegance:filter";

export function FilterLink({
  href,
  filter,
  className,
  style,
  children,
}: {
  href: string;
  filter?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => {
        if (!filter) return;
        window.dispatchEvent(new CustomEvent(EVENT_FILTER, { detail: filter }));
      }}
    >
      {children}
    </a>
  );
}
