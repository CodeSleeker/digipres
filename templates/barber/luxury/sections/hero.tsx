"use client";

import { useEffect, useRef } from "react";
import type { BusinessProfile } from "@/types/business";
import { ButtonLink } from "../components/buttons";
import {
  FINAL_FRAME_INDEX,
  allFrameSrcs,
  frameSrc,
  scrollProgress,
  targetFrame,
} from "../lib/hero-frames";
import styles from "./hero.module.css";

/** Ease factor per frame toward the scroll target. */
const EASE = 0.18;
/** Stop the loop once we're within this many frames of the target. */
const SETTLE_EPSILON = 0.2;

/**
 * Scroll-scrubbed hero: a tall track with a pinned stage, where scroll position
 * maps to a frame index so scrolling performs the haircut.
 *
 * The first frame is rendered server-side, so the panel is never blank and the
 * markup is identical on both sides of hydration. Everything that needs layout
 * or `matchMedia` happens in the effect below, never during render.
 */
export function Hero({ business }: { business: BusinessProfile }) {
  const { hero } = business;
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!track || !stage || !img) return;

    // Reduced motion: no runway, no pinning, no preloading — just the finished
    // cut. The CSS collapses the track; this supplies the poster.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      img.src = frameSrc(FINAL_FRAME_INDEX);
      return;
    }

    let cancelled = false;
    let ready = false;
    let raf = 0;
    let current = 0;
    let target = 0;
    // The server rendered frame 0, so that's what's on screen already.
    let shown = 0;

    /**
     * REQUIREMENT 2: hold the preloaded Image objects so the decoded bitmaps
     * aren't garbage collected between frames.
     */
    const cache: HTMLImageElement[] = [];

    const draw = (frame: number) => {
      const index = Math.round(frame);
      if (index === shown) return;
      shown = index;
      // Assign from the preloaded set — never trigger a fresh fetch.
      img.src = cache[index]?.src ?? frameSrc(index);
    };

    const tick = () => {
      if (cancelled) return;
      /**
       * REQUIREMENT 4: readiness is checked at the TOP and bails BEFORE any
       * easing. Aborting partway through would strand `current` wherever it
       * happened to be and land the scrub on the wrong frame.
       */
      if (!ready) {
        raf = 0;
        return;
      }

      current += (target - current) * EASE;
      if (Math.abs(target - current) < SETTLE_EPSILON) {
        current = target;
        draw(current);
        raf = 0; // settled — stop until the next scroll
        return;
      }

      draw(current);
      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (raf || cancelled) return;
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const progress = scrollProgress(
        track.getBoundingClientRect().top,
        track.offsetHeight,
        window.innerHeight,
      );
      // Drives every grading value in the stylesheet.
      stage.style.setProperty("--hero-progress", progress.toFixed(4));
      target = targetFrame(progress);
      startLoop();
    };

    /**
     * REQUIREMENT 5: bind the listener immediately, not after assets load —
     * pinning and the grade fades must work even if the frames never arrive.
     */
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    /**
     * REQUIREMENT 1: preload with `decode()`, not `onload`. `onload` only means
     * the bytes arrived — not that the frame is rasterised. Without decode()
     * the first pass through the sequence stutters while frames decode
     * mid-scroll and is smooth ever after, a bug that only shows on a cold
     * load. Both resolve and reject are counted so a single bad frame can't
     * stall the set, and scrubbing is enabled only once all 64 have settled.
     */
    const srcs = allFrameSrcs();
    let settled = 0;

    const onSettled = () => {
      settled += 1;
      if (settled < srcs.length || cancelled) return;
      ready = true;
      // Jump straight to where the page already is, rather than animating
      // through frames the visitor never scrolled past.
      current = target;
      draw(current);
      startLoop();
    };

    srcs.forEach((src, i) => {
      const image = new Image();
      cache[i] = image;
      image.src = src;
      if (typeof image.decode === "function") {
        image.decode().then(onSettled, onSettled);
      } else {
        image.onload = onSettled;
        image.onerror = onSettled;
      }
    });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={trackRef} id="hero" className={styles.track}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.media} aria-hidden="true">
          {/*
            A plain <img>, deliberately not next/image: the whole technique
            depends on assigning `src` directly against a manually preloaded
            cache, which next/image's loader and lazy behaviour interfere with.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            className={styles.frame}
            src={frameSrc(0)}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className={styles.grade} aria-hidden="true" />

        <div className={`site-container ${styles.copy}`}>
          <div className={styles.column}>
            <div
              className={`${styles.overline} inline-flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[5px] text-gold before:h-px before:w-[50px] before:bg-gold before:content-[''] max-[768px]:before:w-[30px]`}
            >
              {hero.overline}
            </div>

            <h1
              className={`${styles.title} max-w-[900px] font-heading tracking-[4px] text-white`}
            >
              {hero.titleLines.map((line, i) => (
                <span key={i}>
                  {line.stroke ? (
                    <span className="text-transparent [-webkit-text-stroke:1.5px_var(--color-gold)] max-[480px]:[-webkit-text-stroke:1px_var(--color-gold)]">
                      {line.text}
                    </span>
                  ) : (
                    line.text
                  )}
                  {i < hero.titleLines.length - 1 && <br />}
                </span>
              ))}
            </h1>

            <p
              className={`${styles.description} max-w-[480px] font-light leading-[1.7] text-gray-light`}
            >
              {hero.description}
            </p>

            <div
              className={`${styles.actions} flex flex-wrap gap-5 max-[768px]:flex-col`}
            >
              <ButtonLink
                href={hero.primaryCta.href}
                arrow={hero.primaryCta.arrow}
                className="max-[768px]:w-full max-[768px]:justify-center"
              >
                {hero.primaryCta.label}
              </ButtonLink>
              <ButtonLink
                href={hero.secondaryCta.href}
                variant="outline"
                className="max-[768px]:w-full max-[768px]:justify-center"
              >
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>

            <div
              className={`${styles.stats} flex gap-12 border-t border-dark-border max-[1024px]:gap-8 max-[768px]:flex-wrap max-[768px]:gap-6 max-[480px]:flex-row max-[480px]:justify-between`}
            >
              {hero.stats.map((stat) => (
                <div key={stat.label}>
                  <h3 className="font-heading text-[clamp(1.6rem,3.6vh,2.5rem)] tracking-[2px] text-gold">
                    {stat.value}
                  </h3>
                  <p className="mt-1 text-[0.7rem] uppercase tracking-[3px] text-gray max-[768px]:text-[0.6rem] max-[768px]:tracking-[2px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 z-[2] flex [transform:translateX(-50%)] flex-col items-center gap-3 max-[768px]:hidden max-[680px]:hidden">
          <span className="text-[0.6rem] uppercase tracking-[3px] text-gray">
            Scroll
          </span>
          <div className="relative h-10 w-px overflow-hidden bg-dark-border after:absolute after:-top-full after:h-full after:w-full after:animate-scroll-anim after:bg-gold after:content-['']" />
        </div>
      </div>
    </section>
  );
}
