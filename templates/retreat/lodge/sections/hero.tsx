"use client";

import { Fragment, useRef } from "react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { useHeroScrub } from "../hooks/use-hero-scrub";
import { Btn } from "../components/buttons";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/** The scroll runway, which the header measures its threshold against. */
export const HERO_STAGE_ID = "lodge-hero-stage";

/**
 * The hero.
 *
 * The stage around it is a tall block of scroll; the hero itself is pinned
 * inside with native sticky positioning while the copy retires group by group
 * and the photograph drifts. See `useHeroScrub` for the mechanism — and for
 * what happens on a phone, or when the visitor has asked for less motion,
 * where this is simply a full-height section with a photograph behind it.
 */
export function Hero({ business }: { business: BusinessProfile }) {
  const { hero, retreat } = business;
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useHeroScrub({
    stageRef,
    mediaRef,
    veilRef,
    // The section below is revealed as the pin releases, so it is already
    // there when the hero lets go instead of fading in behind it.
    handoffSelector: "#about .reveal",
  });

  return (
    <div id={HERO_STAGE_ID} ref={stageRef} className="relative z-0">
      {/*
       * `flex-col` with `mt-auto` on the content, NOT `items-end`.
       *
       * They look equivalent — both sit the copy on the floor of the frame —
       * and they differ in the one case that matters. On a 667–740px phone this
       * stack runs ~720px tall, so it does not fit. A flex container that
       * bottom-aligns an item too big for it puts the overflow at the START
       * edge, which sent the eyebrow and the headline up behind the fixed
       * header, clipped by `overflow-hidden`. An auto top margin collapses to
       * zero instead: the section grows downward and everything stays on the
       * page, in order, with nothing hidden.
       */}
      <section
        aria-label="Introduction"
        className="lodge-hero relative isolate flex min-h-svh flex-col overflow-hidden bg-bark"
      >
        <div ref={mediaRef} className="absolute -inset-y-[7%] inset-x-0 -z-20 overflow-hidden">
          {/* The slow settle from a 12% overscale. Decorative motion only: it
              runs once and is switched off under reduced-motion.
              `object-position` sits below centre because the composition puts
              its subject there and the copy occupies the lower left. */}
          <div className="absolute inset-0 overflow-hidden motion-safe:animate-lodge-zoom motion-safe:scale-[1.12] [&_img]:object-[center_55%]">
            <TenantImage
              src={hero.image}
              alt={hero.imageAlt ?? ""}
              sizes="100vw"
              priority
            />
          </div>
        </div>

        {/*
         * The fixed scrim — two gradients, because the copy is anchored to one
         * CORNER, not to the whole frame.
         *
         * Vertical: darkens the top for the header and the bottom third for the
         * heading block, staying light across the middle so the photograph is
         * still a photograph.
         *
         * Horizontal: the copy column runs down the lower left, and a vertical
         * gradient alone has to darken the entire width to protect it. This
         * carries the left instead and releases by ~72%, so the right of the
         * frame keeps its full brightness.
         *
         * Both are needed at rest: the veil below is scrubbed from zero, so at
         * the top of the page these two are the only thing holding contrast.
         */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(32,33,30,0.55)_0%,rgba(32,33,30,0.14)_30%,rgba(32,33,30,0.38)_62%,rgba(32,33,30,0.88)_100%),linear-gradient(100deg,rgba(32,33,30,0.62)_0%,rgba(32,33,30,0.34)_42%,rgba(32,33,30,0)_72%)]"
        />
        {/* Scrubbed veil: deepens through the pin so the copy keeps its
            contrast as the picture brightens under it. */}
        <div
          ref={veilRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_20%_78%,rgba(32,33,30,0.9),rgba(32,33,30,0.55))] opacity-0"
        />

        {/* The top padding is what reserves the header's own height. Without it
            the first line of copy starts at the very top of the section — which
            is the top of the PAGE, directly under a fixed header. */}
        <div className="relative mx-auto mt-auto w-full max-w-[var(--lodge-shell)] px-[var(--lodge-gutter)] pb-[clamp(3.5rem,7vh,5.5rem)] pt-[calc(var(--lodge-nav-h)+1.25rem)] text-ivory">
          <div data-hero-group="eyebrow" className="will-change-[transform,opacity]">
            <Eyebrow className="reveal lodge-on-photo text-[rgba(245,241,232,0.94)]">
              {hero.overline}
            </Eyebrow>
          </div>

          <div data-hero-group="title" className="will-change-[transform,opacity]">
            <h1
              className="reveal lodge-on-photo mt-6 max-w-[16ch] font-lodge text-[clamp(2.9rem,7.4vw,6.6rem)] font-normal leading-[1.03] tracking-[-0.012em]"
              style={stagger(1)}
            >
              {hero.titleLines.map((line, i) => (
                <Fragment key={`${i}-${line.text}`}>
                  {i > 0 && <br />}
                  {/* `stroke` is the shared flag for "set this line apart".
                      The barber outlines it in gold; here it is the Cormorant
                      italic, which is this design's own emphasis. */}
                  {line.stroke ? (
                    <span className="italic">{line.text}</span>
                  ) : (
                    line.text
                  )}
                </Fragment>
              ))}
            </h1>
          </div>

          <div data-hero-group="copy" className="will-change-[transform,opacity]">
            <p
              className="reveal lodge-on-photo mt-[1.8rem] max-w-[42ch] text-[clamp(1.02rem,1.25vw,1.2rem)] font-light leading-[1.7] text-[rgba(245,241,232,0.95)]"
              style={stagger(2)}
            >
              {hero.description}
            </p>
            <div
              className="reveal mt-[2.6rem] flex flex-wrap gap-[0.9rem] max-[520px]:[&>a]:flex-[1_1_100%] max-[520px]:[&>a]:justify-center"
              style={stagger(3)}
            >
              <Btn
                href={hero.primaryCta.href}
                variant="light"
                arrow={hero.primaryCta.arrow}
              >
                {hero.primaryCta.label}
              </Btn>
              <Btn
                href={hero.secondaryCta.href}
                variant="ghostLight"
                arrow={hero.secondaryCta.arrow}
              >
                {hero.secondaryCta.label}
              </Btn>
            </div>
          </div>

          <div
            className="reveal mt-[clamp(2.8rem,6vh,4.2rem)] flex items-end justify-between gap-8 border-t border-[rgba(245,241,232,0.34)] pt-[1.4rem] max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-[1.6rem]"
            style={stagger(4)}
          >
            {retreat?.place && (
              <div
                data-hero-group="place"
                className="origin-bottom-left will-change-[transform,opacity]"
              >
                <p className="lodge-on-photo text-[0.72rem] uppercase leading-[2] tracking-[0.2em] text-[rgba(245,241,232,0.92)]">
                  {retreat.place.locality}
                  {/*
                   * Gains its own presence as the scrub runs: the hook writes
                   * `--lodge-place` from 0 → 1 across the second half.
                   *
                   * The floor is 0.72 of an already-dimmed ivory, not the
                   * mockup's 0.58: this is 11px small caps on a photograph, and
                   * the resting state is what most readers see. The RANGE is
                   * what the effect is for, so it still lifts — from legible to
                   * prominent rather than from faint to legible.
                   */}
                  <span className="block text-[rgba(245,241,232,0.82)] opacity-[calc(0.72+(0.28*var(--lodge-place,0)))]">
                    {retreat.place.country}
                  </span>
                </p>
              </div>
            )}

            <div data-hero-group="cue" className="will-change-[transform,opacity]">
              <a
                href="#about"
                aria-label="Scroll to the introduction"
                className="lodge-on-photo flex items-center gap-[0.8rem] text-[0.64rem] uppercase tracking-[0.22em] text-[rgba(245,241,232,0.88)]"
              >
                <i
                  aria-hidden="true"
                  className="block h-[52px] w-px origin-top bg-[linear-gradient(180deg,rgba(245,241,232,0.15),rgba(245,241,232,0.95))] motion-safe:animate-lodge-cue max-[720px]:h-[38px]"
                />
                Scroll
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
