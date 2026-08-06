"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessProfile, GalleryItem } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { Frame } from "../components/frame";
import { HeadRow } from "../components/section-head";
import { CaretLeft, CaretRight, Close } from "../components/icons";
import { stagger } from "../lib/reveal";

/**
 * Recent work, as a masonry of openable photographs.
 *
 * Each tile is a real `<button>`: it is an action (open the viewer), and making
 * it one gives keyboard operation, focus and the announced role for free rather
 * than through `role`/`tabindex`/keydown bookkeeping of our own.
 */
export function Gallery({ business }: { business: BusinessProfile }) {
  const { gallery } = business;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!gallery.items.length) return null;

  return (
    <section id="gallery" className="relative pb-[var(--pastry-section)]">
      <div className="pastry-shell">
        <HeadRow heading={gallery.heading} className="mb-0" />

        <div className="mt-[clamp(2.5rem,2rem+2vw,3.5rem)] columns-4 gap-[1.15rem] max-[1100px]:columns-3 max-[760px]:columns-2 max-[440px]:columns-1">
          {gallery.items.map((item, i) => (
            <button
              key={item.image}
              type="button"
              onClick={() => setOpenIndex(i)}
              style={stagger(i % 8)}
              className="group reveal mb-[1.15rem] block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-[22px] border-0 bg-transparent p-0 shadow-[var(--pastry-sh-sm)] transition-[transform,box-shadow] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-[5px] hover:shadow-[var(--pastry-sh-md)]"
            >
              <Frame
                src={item.image}
                alt={altFor(item)}
                sizes="(max-width: 440px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 31vw, 23vw"
                className="rounded-[22px]"
                style={{ aspectRatio: tileRatio(item, i) }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(47,42,38,0)_55%,rgba(47,42,38,0.42)_100%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                {/* Always in the DOM so the caption is read with the photo; the
                    fade is a flourish for a sighted mouse, nothing more. */}
                <span className="absolute inset-x-4 bottom-[0.9rem] z-[2] translate-y-2 text-left text-[0.8rem] font-medium text-white opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  {captionFor(item)}
                </span>
              </Frame>
            </button>
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          items={gallery.items}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}

/**
 * The shape of a tile.
 *
 * The photograph's own proportions when they are known — that is what makes a
 * masonry a masonry, and it means nothing is cropped. They are measured when
 * the picture is added to the CMS, so an older gallery (or one whose image
 * failed to load at that moment) may not have them.
 *
 * Without them the tiles fall back to a cycled set of portrait-leaning ratios:
 * uneven enough to keep the column rhythm, stable across renders in a way a
 * random pick would not be, and cropping to fit as the source did.
 */
function tileRatio(item: GalleryItem, index: number): string {
  if (item.width && item.height) return `${item.width} / ${item.height}`;
  return FALLBACK_RATIOS[index % FALLBACK_RATIOS.length]!;
}

const FALLBACK_RATIOS = ["7 / 9", "1 / 1", "7 / 10", "7 / 8"];

/** The owner's description when they wrote one; the title is the fallback. */
function altFor(item: GalleryItem): string {
  return item.alt ?? item.title;
}

/** The visible caption: the line beneath the photo, else its title. */
function captionFor(item: GalleryItem): string {
  return item.caption ?? item.title;
}

/**
 * The full-size viewer.
 *
 * Mounted only while open, which is what makes the focus handling simple: the
 * close button takes focus on mount, focus is returned to the tile on unmount,
 * and the page behind cannot scroll in between. Escape and the arrow keys are
 * bound at the document because the dialog owns the whole viewport while it is
 * up.
 */
function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const step = useCallback(
    (delta: number) => onIndex((index + delta + items.length) % items.length),
    [index, items.length, onIndex],
  );

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      returnTo.current?.focus();
    };
    // `step` changes with the index; re-binding it each time keeps the arrow
    // keys pointed at the photo currently on screen.
  }, [step, onClose]);

  const item = items[index]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,18,14,0.88)] p-[clamp(1rem,4vw,3rem)] backdrop-blur-[10px]"
    >
      <LightboxButton
        ref={closeRef}
        label="Close gallery"
        onClick={onClose}
        className="right-[clamp(1rem,3vw,2rem)] top-[clamp(1rem,3vw,2rem)]"
      >
        <Close />
      </LightboxButton>
      {items.length > 1 && (
        <>
          <LightboxButton
            label="Previous image"
            onClick={() => step(-1)}
            className="left-[clamp(0.5rem,2vw,2rem)] top-1/2 -translate-y-1/2"
          >
            <CaretLeft />
          </LightboxButton>
          <LightboxButton
            label="Next image"
            onClick={() => step(1)}
            className="right-[clamp(0.5rem,2vw,2rem)] top-1/2 -translate-y-1/2"
          >
            <CaretRight />
          </LightboxButton>
        </>
      )}

      <figure className="m-0 max-h-full w-full max-w-[min(1000px,100%)]">
        {/* The photograph's own shape when it is known, so nothing is
            letterboxed; `object-contain` keeps the fallback box honest for the
            pictures whose size was never measured. */}
        <div
          className="relative mx-auto max-h-[78vh] w-full"
          style={{ aspectRatio: tileRatio(item, index) }}
        >
          <TenantImage
            src={item.image}
            alt={altFor(item)}
            sizes="(max-width: 1000px) 92vw, 1000px"
            className="rounded-[22px] !object-contain drop-shadow-[0_40px_90px_rgba(0,0,0,0.55)]"
          />
        </div>
        <figcaption className="mt-4 text-center text-[0.85rem] text-[rgba(255,253,248,0.82)]">
          {captionFor(item)}
        </figcaption>
      </figure>
    </div>
  );
}

function LightboxButton({
  ref,
  label,
  onClick,
  className,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute grid h-12 w-12 cursor-pointer place-content-center rounded-full border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.1)] text-white transition-[background-color,transform] duration-300 hover:scale-105 hover:bg-[rgba(255,255,255,0.22)] ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
