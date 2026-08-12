"use client";

import { useRef } from "react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { useParallax } from "../hooks/use-parallax";
import { ItalicLastLine } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The full-bleed break between the stay and the gallery.
 *
 * A pause rather than a section: one photograph, one line, and a drift that
 * only exists to keep it from feeling like a printed page. It carries no
 * information a reader could miss, so on a phone — and under reduced motion —
 * the drift is simply dropped.
 */
export function ImageBreak({ business }: { business: BusinessProfile }) {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  useParallax(sectionRef, layerRef);

  const content = business.retreat?.imageBreak;
  if (!content) return null;

  return (
    <section
      ref={sectionRef}
      aria-label="Stay a little longer"
      className="lodge-on-dark relative z-[1] grid min-h-[clamp(460px,86vh,860px)] place-items-center overflow-hidden bg-forest"
    >
      <div
        ref={layerRef}
        className="absolute -inset-y-[12%] inset-x-0 -z-20 will-change-transform max-[960px]:-inset-y-[6%]"
      >
        <TenantImage
          src={content.image}
          alt={content.imageAlt}
          sizes="100vw"
        />
      </div>
      {/* The copy is centred, so the radial does the work: it darkens the
          middle of the frame where the type is and releases at the edges. Both
          layers are a step stronger than the mockup's — the line sits dead
          centre, where a landscape photograph is usually at its brightest. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_50%,rgba(32,33,30,0.46),rgba(32,33,30,0.1)_70%),linear-gradient(180deg,rgba(32,33,30,0.5),rgba(32,33,30,0.64))]"
      />

      {/*
       * `max-width` is a LENGTH here, not `ch`.
       *
       * The `ch` unit would resolve against this block's small sans font while
       * the headline inside renders at ~5rem serif — collapsing the line to one
       * word per row. Carried over from the mockup, where it is commented for
       * the same reason.
       */}
      <div className="max-w-[min(92vw,900px)] px-[var(--lodge-gutter)] text-center text-ivory">
        <h2 className="reveal lodge-on-photo font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] [text-wrap:balance]">
          <ItalicLastLine lines={content.titleLines} />
        </h2>
        <p
          className="reveal lodge-on-photo mt-[1.4rem] text-[0.95rem] font-light tracking-[0.02em] text-[rgba(245,241,232,0.86)]"
          style={stagger(1)}
        >
          {content.note}
        </p>
      </div>
    </section>
  );
}
