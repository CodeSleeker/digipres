"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { Frame } from "../components/frame";
import { HeadRow } from "../components/section-head";
import { ChevronLeft, ChevronRight, Clock, Plus } from "../components/icons";
import { stagger } from "../lib/reveal";

/**
 * The best sellers rail.
 *
 * A real horizontal scroller, not a carousel: it scrolls with a trackpad, a
 * swipe, the arrow keys and the buttons, and every card is in the DOM and in
 * the tab order at all times. The buttons are a convenience on top of that, so
 * losing the script costs a shortcut rather than the content.
 */
export function BestSellers({ business }: { business: BusinessProfile }) {
  const { products, patisserie } = business;
  const railRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth - 2;
    setAtStart(rail.scrollLeft <= 2);
    // `max <= 0` means everything already fits — both ends are "reached", so
    // neither button offers a move that would do anything.
    setAtEnd(max <= 0 || rail.scrollLeft >= max);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const scrollBy = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("li");
    // +22px for the gap, so a step lands on the next card rather than between.
    const step = card ? card.getBoundingClientRect().width + 22 : 300;
    rail.scrollBy({
      left: step * direction,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (!products.items.length) return null;

  return (
    <section
      id="bestsellers"
      className="relative bg-beige py-[var(--pastry-section)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[var(--pastry-line-soft)] before:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--pastry-line-soft)] after:content-['']"
    >
      <div className="pastry-shell">
        <HeadRow heading={products.heading}>
          <div className="reveal flex gap-[0.55rem]" style={stagger(1)}>
            <RailButton
              label="Scroll best sellers left"
              disabled={atStart}
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeft />
            </RailButton>
            <RailButton
              label="Scroll best sellers right"
              disabled={atEnd}
              onClick={() => scrollBy(1)}
            >
              <ChevronRight />
            </RailButton>
          </div>
        </HeadRow>

        <ul
          ref={railRef}
          onScroll={sync}
          tabIndex={0}
          aria-label="Best selling desserts, scrollable"
          className="-mx-1 mt-[clamp(2.25rem,1.5rem+2vw,3.25rem)] flex list-none snap-x snap-mandatory gap-[1.35rem] overflow-x-auto px-1 pb-7 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.items.map((item, i) => (
            <li
              key={item.name}
              className="group reveal flex flex-[0_0_clamp(238px,26vw,286px)] snap-start flex-col overflow-hidden rounded-[22px] border border-[var(--pastry-line-soft)] bg-snow shadow-[var(--pastry-sh-sm)] transition-[transform,box-shadow] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1.5 hover:shadow-[var(--pastry-sh-md)]"
              style={stagger(i)}
            >
              <Frame
                src={item.image}
                alt={item.imageAlt ?? ""}
                sizes="286px"
                className="aspect-square rounded-none"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-[0.85rem] top-[0.85rem] z-[2] grid h-[38px] w-[38px] place-content-center rounded-full bg-[rgba(255,255,255,0.82)] font-display text-[0.9rem] text-ink shadow-[0_4px_12px_-6px_rgba(47,42,38,0.5)] backdrop-blur-[10px]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Frame>

              <div className="flex flex-1 flex-col px-5 pb-[1.35rem] pt-[1.15rem]">
                <h3 className="font-display text-[1rem] font-medium leading-[1.1] tracking-[-0.006em] text-ink">
                  {item.name}
                </h3>
                {item.meta && (
                  <p className="mt-[0.35rem] text-[0.78rem] text-ink-45">
                    {item.meta}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <span className="font-display text-[1.3rem] text-ink">
                    {item.price}
                  </span>
                  {/* The mockup's "+" acknowledged an add-to-basket that no
                      ordering service backs yet. Rather than animate a tick for
                      something that never happens, it starts the enquiry the
                      shop can actually act on. */}
                  <a
                    href="#contact"
                    aria-label={`Enquire about ${item.name}`}
                    className="grid h-[38px] w-[38px] flex-none place-content-center rounded-full border border-[var(--pastry-line)] text-ink transition-[background-color,color,border-color,transform] duration-300 hover:scale-105 hover:border-ink hover:bg-ink hover:text-paper"
                  >
                    <Plus />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {patisserie?.railNote && (
          <p className="reveal flex items-center gap-[0.6rem] text-[0.8rem] text-ink-45">
            <Clock />
            {patisserie.railNote}
          </p>
        )}
      </div>
    </section>
  );
}

function RailButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-[46px] w-[46px] cursor-pointer place-content-center rounded-full border border-[var(--pastry-line)] bg-snow text-ink",
        "transition-[background-color,color,transform,opacity] duration-300",
        "enabled:hover:-translate-y-0.5 enabled:hover:bg-ink enabled:hover:text-paper",
        "disabled:cursor-not-allowed disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
