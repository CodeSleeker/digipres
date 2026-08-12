"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessProfile, GalleryItem } from "@/types/business";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The asymmetric composition, as a repeating rhythm.
 *
 * The mockup lays out five fixed tiles; a tenant has however many photographs
 * they have, so the shapes cycle instead. Four mosaic shapes, plus a full-width
 * one an owner selects per item — which is what the CMS's "wide" checkbox has
 * always meant, and what makes the mockup's own composition reproducible from
 * ordinary content rather than hard-coded.
 */
const SHAPES = [
  "col-span-7 row-span-4 max-[960px]:col-span-6 max-[960px]:row-span-3",
  "col-span-5 row-span-6 max-[960px]:col-span-3 max-[960px]:row-span-4 max-[520px]:col-span-6",
  "col-span-4 row-span-3 max-[960px]:col-span-3 max-[960px]:row-span-4 max-[520px]:col-span-6",
  "col-span-3 row-span-3 max-[960px]:col-span-6 max-[960px]:row-span-3",
];
const WIDE_SHAPE =
  "col-span-12 row-span-4 max-[960px]:col-span-6 max-[960px]:row-span-3";

export function Gallery({ business }: { business: BusinessProfile }) {
  const { gallery } = business;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /** The tile that opened the viewer, so focus can be handed back to it. */
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const open = (index: number, trigger: HTMLButtonElement) => {
    openerRef.current = trigger;
    setOpenIndex(index);
  };

  const close = useCallback(() => {
    setOpenIndex(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + gallery.items.length) % gallery.items.length,
      ),
    [gallery.items.length],
  );

  if (gallery.items.length === 0) return null;

  // A wide tile takes the full row wherever it falls; everything else cycles
  // through the mosaic, counted separately so one wide item doesn't shunt the
  // rhythm of the tiles around it.
  let mosaic = 0;

  return (
    <section
      id="gallery"
      className="relative z-[1] bg-ivory py-[var(--lodge-section-lg)]"
    >
      <div className="lodge-shell">
        <div className="mb-[clamp(2.5rem,5vw,4rem)] grid grid-cols-[1fr_auto] items-end gap-8 max-[720px]:grid-cols-1 max-[720px]:items-start max-[720px]:gap-[1.6rem]">
          <div>
            <Eyebrow className="reveal">{gallery.heading.label}</Eyebrow>
            <h2
              className="reveal mt-6 max-w-[16ch] font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-bark [text-wrap:balance]"
              style={stagger(1)}
            >
              {gallery.heading.title}
            </h2>
          </div>
          {gallery.heading.subtitle && (
            <p
              className="reveal text-[0.7rem] uppercase tracking-[0.18em] text-sage"
              style={stagger(2)}
            >
              {gallery.heading.subtitle}
            </p>
          )}
        </div>

        <div className="grid auto-rows-[clamp(90px,11vw,150px)] grid-cols-12 gap-[clamp(0.7rem,1.4vw,1.35rem)] max-[960px]:auto-rows-[clamp(84px,15vw,130px)] max-[960px]:grid-cols-6 max-[520px]:auto-rows-[clamp(78px,20vw,110px)]">
          {gallery.items.map((item, i) => {
            const shape = item.wide
              ? WIDE_SHAPE
              : SHAPES[mosaic++ % SHAPES.length]!;

            // The group is the FIGURE, not the button: the scrim and the
            // caption are siblings of the button, and a group- variant only
            // reaches descendants of the element carrying the class.
            // `focus-within` for the same reason — the figure can't take focus
            // itself, so it watches for focus landing on the button.
            return (
              <figure
                key={`${item.title}-${i}`}
                className={cn("group/tile relative", shape)}
              >
                <button
                  type="button"
                  onClick={(e) => open(i, e.currentTarget)}
                  aria-label={`View ${item.title}`}
                  className="reveal reveal-img block h-full w-full cursor-zoom-in overflow-hidden rounded-[2px] bg-sand text-left"
                  style={stagger(i % 2)}
                >
                  <TenantImage
                    src={item.image}
                    alt={item.alt ?? item.title}
                    sizes="(max-width: 960px) 92vw, 55vw"
                  />
                </button>
                {/*
                 * A scrim under the caption, fading in with it.
                 *
                 * The caption is 10px ivory dropped straight onto whichever
                 * photograph it labels — over a pale kitchen or a bright sky it
                 * was invisible, and a text-shadow alone cannot rescue type
                 * that small. It appears only with the caption, so the tile is
                 * still an unobstructed photograph at rest.
                 */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-[2px] bg-[linear-gradient(180deg,rgba(32,33,30,0)_0%,rgba(32,33,30,0.62)_100%)] opacity-0 transition-opacity duration-[550ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover/tile:opacity-100 group-focus-within/tile:opacity-100"
                />
                {/* Shown on hover or keyboard focus. The title is already the
                    button's accessible name, so this is hidden from assistive
                    tech rather than announced twice. */}
                <figcaption
                  aria-hidden="true"
                  className="lodge-on-photo pointer-events-none absolute bottom-4 left-[1.1rem] translate-y-[6px] text-[0.63rem] uppercase tracking-[0.2em] text-ivory opacity-0 transition-[opacity,transform] duration-[550ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100"
                >
                  {item.title}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          item={gallery.items[openIndex]!}
          onClose={close}
          onStep={step}
        />
      )}
    </section>
  );
}

/**
 * The image viewer.
 *
 * Mounted only while open, so there is no hidden dialog in the document the
 * rest of the time. Focus moves to the close button on open and back to the
 * tile that opened it on close; Tab cycles the three controls and never leaves
 * the dialog, which is what `aria-modal` promises and what a reader using the
 * keyboard would otherwise find broken.
 */
function Lightbox({
  item,
  onClose,
  onStep,
}: {
  item: GalleryItem;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowLeft") return onStep(-1);
      if (e.key === "ArrowRight") return onStep(1);
      if (e.key !== "Tab") return;

      const focusables = [
        closeRef.current,
        prevRef.current,
        nextRef.current,
      ].filter((el): el is HTMLButtonElement => el !== null);
      if (!focusables.length) return;

      e.preventDefault();
      const delta = e.shiftKey ? -1 : 1;
      const current = focusables.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      // Focus somewhere outside the dialog: step in from the end it came from,
      // so Tab lands on the first control and Shift+Tab on the last.
      const from = current === -1 ? (e.shiftKey ? 0 : -1) : current;
      focusables[
        (from + delta + focusables.length) % focusables.length
      ]?.focus();
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onStep]);

  const ratio =
    item.width && item.height ? `${item.width}/${item.height}` : "3/2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] grid place-items-center bg-[rgba(20,21,19,0.95)] p-[clamp(1rem,5vw,4rem)]"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-[clamp(1rem,3vw,2rem)] top-[clamp(1rem,3vw,2rem)] grid h-12 w-12 place-items-center rounded-full border border-[rgba(245,241,232,0.3)] text-[1.5rem] leading-none text-ivory transition-colors duration-[400ms] hover:bg-ivory hover:text-bark"
      >
        ×
      </button>
      <button
        ref={prevRef}
        type="button"
        onClick={() => onStep(-1)}
        aria-label="Previous image"
        className="absolute left-[clamp(0.6rem,3vw,2.4rem)] top-1/2 grid h-[52px] w-[52px] -translate-y-1/2 place-items-center rounded-full border border-[rgba(245,241,232,0.22)] text-[1.3rem] text-ivory transition-colors duration-[400ms] hover:bg-ivory hover:text-bark max-[720px]:h-11 max-[720px]:w-11"
      >
        ‹
      </button>
      <button
        ref={nextRef}
        type="button"
        onClick={() => onStep(1)}
        aria-label="Next image"
        className="absolute right-[clamp(0.6rem,3vw,2.4rem)] top-1/2 grid h-[52px] w-[52px] -translate-y-1/2 place-items-center rounded-full border border-[rgba(245,241,232,0.22)] text-[1.3rem] text-ivory transition-colors duration-[400ms] hover:bg-ivory hover:text-bark max-[720px]:h-11 max-[720px]:w-11"
      >
        ›
      </button>

      <figure className="m-0">
        <div
          className="relative max-h-[82vh] w-[min(1100px,92vw)] overflow-hidden rounded-[2px] [&_img]:object-contain"
          style={{ aspectRatio: ratio }}
        >
          <TenantImage
            src={item.image}
            alt={item.alt ?? item.title}
            sizes="(max-width: 1100px) 92vw, 1100px"
          />
        </div>
        <figcaption className="mt-[1.2rem] text-center text-[0.66rem] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.6)]">
          {item.caption ?? item.title}
        </figcaption>
      </figure>
    </div>
  );
}
