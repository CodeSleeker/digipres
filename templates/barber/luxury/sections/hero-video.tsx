"use client";

import { useEffect, useRef, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { ButtonLink } from "../components/buttons";
import { frameSrc, allFrameSrcs, scrollProgress } from "../lib/hero-frames";
import {
  CAPTURE_PLAYBACK_RATE,
  CAPTURE_WATCHDOG_MS,
  MAX_DPR,
  SEEK_TIMEOUT_MS,
  captureBudget,
  coverRect,
  frameIndexFor,
  sampleTimes,
  slotForTime,
} from "../lib/hero-capture";
import styles from "./hero-video.module.css";

export const HERO_VIDEO_SRC = "/templates/barber-luxury/hero-scrub.mp4";
export const HERO_POSTER_SRC = "/templates/barber-luxury/hero-poster.jpg";

/** drawImage accepts both, so the render path is identical for either source. */
type Frame = ImageBitmap | HTMLImageElement;

/** `requestVideoFrameCallback` isn't in every TS lib.dom yet. */
interface FrameMetadata {
  mediaTime: number;
}
type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    cb: (now: number, metadata: FrameMetadata) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/** NETWORK_NO_SOURCE — the video already gave up before we mounted. */
const NETWORK_NO_SOURCE = 3;

function sourceSize(frame: Frame): { w: number; h: number } {
  return frame instanceof HTMLImageElement
    ? { w: frame.naturalWidth, h: frame.naturalHeight }
    : { w: frame.width, h: frame.height };
}

/**
 * Scroll-scrubbed hero, VIDEO source — the alternative to the frame-sequence
 * hero in ./hero.tsx. Both are interchangeable; see the `heroMedia` field.
 *
 * The video is never seeked and no <img> src is swapped on scroll: both were
 * tried and both stutter. Instead the clip is played through ONCE at 3× while
 * `requestVideoFrameCallback` samples it into ImageBitmaps, and scroll then
 * paints those to a canvas. Bitmaps are GPU-ready, so drawing is synchronous —
 * no decode jank, no seeking.
 */
export function HeroVideo({ business }: { business: BusinessProfile }) {
  const { hero } = business;
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Guards against a concurrent second capture (React StrictMode in dev). */
  const capturingRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current as VideoWithRVFC | null;
    if (!track || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let frames: Frame[] = [];
    /** Deduped for close() — one bitmap can fill several slots. */
    const owned = new Set<ImageBitmap>();
    let lastIndex = -1;
    let vfcHandle = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    /* ── Rendering ─────────────────────────────────────────────────────── */

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastIndex = -1; // force a repaint at the new size
      }
    };

    const paint = (frame: Frame) => {
      const { w, h } = sourceSize(frame);
      // Canvas has no object-fit; this is `object-position: center 28%`.
      const { dx, dy, dw, dh } = coverRect(w, h, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame, dx, dy, dw, dh);
    };

    const render = () => {
      if (!frames.length) return;
      const index = frameIndexFor(readProgress(), frames.length);
      if (index === lastIndex) return;
      const frame = frames[index];
      if (!frame) return; // slot not captured yet — keep the previous paint
      lastIndex = index;
      paint(frame);
    };

    const readProgress = () =>
      scrollProgress(
        track.getBoundingClientRect().top,
        track.offsetHeight,
        window.innerHeight,
      );

    /**
     * NON-NEGOTIABLE 5: the progress writer runs on EVERY scroll whether or not
     * frames exist — pinning and the grade fades must never depend on capture.
     */
    const onScroll = () => {
      stage.style.setProperty("--hero-progress", readProgress().toFixed(4));
      render();
    };
    const onResize = () => {
      sizeCanvas();
      lastIndex = -1;
      onScroll();
    };

    sizeCanvas();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    const cleanup = () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (watchdog) clearTimeout(watchdog);
      if (video) {
        video.pause();
        if (vfcHandle && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(vfcHandle);
        }
      }
      // The main leak risk: bitmaps are uncompressed and are not released by
      // dropping the reference alone.
      owned.forEach((bitmap) => bitmap.close());
      owned.clear();
      frames = [];
      capturingRef.current = false;
    };

    /* ── Reduced motion: no capture, no playback, one still ─────────────── */

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const still = new Image();
      still.src = frameSrc(63); // f_064 — the finished cut
      still
        .decode()
        .then(() => {
          if (cancelled) return;
          frames = [still];
          lastIndex = -1;
          paint(still);
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
      return cleanup;
    }

    /* ── Capture ───────────────────────────────────────────────────────── */

    const { sampleCount, resizeWidth } = captureBudget(window.innerWidth);
    const slots: Frame[] = new Array(sampleCount);
    frames = slots; // partial scrubbing works behind the veil

    const finish = () => {
      if (cancelled) return;
      if (watchdog) clearTimeout(watchdog);
      lastIndex = -1;
      onScroll();
      setReady(true); // fades the veil out
    };

    const bitmapOptions = (): ImageBitmapOptions | undefined => {
      if (!video?.videoWidth || !video.videoHeight) return undefined;
      return {
        resizeWidth,
        resizeHeight: Math.round(
          resizeWidth * (video.videoHeight / video.videoWidth),
        ),
        resizeQuality: "high",
      };
    };

    /** FALLBACK B — the 64 WebP stills. Always available, never fails loudly. */
    const captureFromStills = async () => {
      if (cancelled) return;
      const loaded = await Promise.all(
        allFrameSrcs().map(
          (src) =>
            new Promise<HTMLImageElement | null>((resolve) => {
              const img = new Image();
              img.src = src;
              const ok = () => resolve(img);
              // Count success AND failure so one bad still can't stall the set.
              img.decode().then(ok, () => resolve(img.complete ? img : null));
            }),
        ),
      );
      if (cancelled) return;
      frames = loaded.filter((img): img is HTMLImageElement => img !== null);
      finish();
    };

    /** FALLBACK A — step with seeks, guarded so a stuck seek can't hang. */
    const seekTo = (time: number) =>
      new Promise<boolean>((resolve) => {
        if (!video) return resolve(false);
        const timer = setTimeout(() => {
          video.removeEventListener("seeked", onSeeked);
          resolve(false);
        }, SEEK_TIMEOUT_MS);
        const onSeeked = () => {
          clearTimeout(timer);
          video.removeEventListener("seeked", onSeeked);
          resolve(true);
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = time;
      });

    const captureBySeeking = async () => {
      if (!video) return captureFromStills();
      const times = sampleTimes(video.duration || 0, sampleCount);
      if (!times.length) return captureFromStills();

      for (let i = 0; i < times.length; i++) {
        if (cancelled) return;
        if (!(await seekTo(times[i]))) continue;
        try {
          const bitmap = await createImageBitmap(video, bitmapOptions());
          if (cancelled) return void bitmap.close();
          owned.add(bitmap);
          slots[i] = bitmap;
        } catch {
          /* skip this sample rather than abandoning the run */
        }
      }
      finish();
    };

    /** PRIMARY — sample while playing once at 3×. */
    const captureByPlayback = () => {
      if (!video || typeof video.requestVideoFrameCallback !== "function") {
        return false;
      }

      let cursor = 0;
      let inFlight = false;

      const onFrame = (_now: number, metadata: FrameMetadata) => {
        if (cancelled) return;
        const reached = slotForTime(
          metadata.mediaTime,
          video.duration || 0,
          sampleCount,
        );

        if (!inFlight && reached >= cursor) {
          inFlight = true;
          createImageBitmap(video, bitmapOptions())
            .then((bitmap) => {
              if (cancelled) return void bitmap.close();
              owned.add(bitmap);
              /**
               * At 3× one presented frame can straddle several slots — fill
               * them all with it. Leaving holes is what produces black
               * flashes mid-scrub.
               */
              for (let i = cursor; i <= reached; i++) slots[i] = bitmap;
              cursor = reached + 1;
              if (cursor >= sampleCount) finish();
            })
            .catch(() => {})
            .finally(() => {
              inFlight = false;
            });
        }

        if (!cancelled && cursor < sampleCount) {
          vfcHandle = video.requestVideoFrameCallback!(onFrame);
        }
      };

      video.muted = true;
      video.playsInline = true;
      video.playbackRate = CAPTURE_PLAYBACK_RATE;
      vfcHandle = video.requestVideoFrameCallback(onFrame);

      video.play().catch(() => {
        // Autoplay refused → step with seeks instead.
        if (!cancelled) void captureBySeeking();
      });
      // A short clip that ends before every slot filled still completes.
      video.addEventListener("ended", finish, { once: true });
      return true;
    };

    /**
     * NON-NEGOTIABLE 3: the video can fail BEFORE this effect runs, so the
     * error event is already gone — check the element's state directly too.
     */
    const alreadyFailed = () =>
      !video || !!video.error || video.networkState === NETWORK_NO_SOURCE;

    const start = () => {
      // StrictMode double-invoke guard: never run two captures at once.
      if (capturingRef.current) return;
      capturingRef.current = true;

      if (alreadyFailed()) {
        void captureFromStills();
        return;
      }

      video?.addEventListener(
        "error",
        () => {
          if (!cancelled) void captureFromStills();
        },
        { once: true },
      );

      /** NON-NEGOTIABLE 4: never leave the veil up forever. */
      watchdog = setTimeout(() => {
        if (!cancelled && !ready) void captureFromStills();
      }, CAPTURE_WATCHDOG_MS);

      try {
        if (!captureByPlayback()) void captureBySeeking();
      } catch {
        void captureFromStills();
      }
    };

    if (video && video.readyState >= 1) {
      start();
    } else {
      video?.addEventListener("loadedmetadata", start, { once: true });
      // Metadata may never arrive; alreadyFailed() covers the rest.
      if (alreadyFailed()) start();
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section ref={trackRef} id="hero" className={styles.track}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.media} aria-hidden="true">
          <canvas ref={canvasRef} className={styles.canvas} />
          <div
            className={`${styles.veil} ${ready ? styles.veilHidden : ""}`}
            aria-hidden="true"
          />
          {/*
            NON-NEGOTIABLE 2: `src` lives on the element, never in a <source>
            child — a failing <source> fires `error` on itself, so the video
            never reports it and the fallback never runs.
          */}
          <video
            ref={videoRef}
            className={styles.source}
            /* The owner's uploaded/linked clip when set, else the template's. */
            src={hero.heroVideoUrl || HERO_VIDEO_SRC}
            poster={HERO_POSTER_SRC}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
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

        <div className="absolute bottom-10 left-1/2 z-[3] flex [transform:translateX(-50%)] flex-col items-center gap-3 max-[768px]:hidden max-[680px]:hidden">
          <span className="text-[0.6rem] uppercase tracking-[3px] text-gray">
            Scroll
          </span>
          <div className="relative h-10 w-px overflow-hidden bg-dark-border after:absolute after:-top-full after:h-full after:w-full after:animate-scroll-anim after:bg-gold after:content-['']" />
        </div>
      </div>
    </section>
  );
}
