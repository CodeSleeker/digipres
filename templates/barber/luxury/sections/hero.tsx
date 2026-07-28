"use client";

import { useRef } from "react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { ButtonLink } from "../components/buttons";
import { useParallax } from "../hooks/use-parallax";

export function Hero({ business }: { business: BusinessProfile }) {
  const { hero } = business;
  const bgRef = useRef<HTMLDivElement>(null);
  useParallax(bgRef, 0.3);

  return (
    <section
      id="hero"
      className="group relative flex min-h-screen items-center overflow-hidden bg-black max-[768px]:min-h-[100svh]"
    >
      <div className="absolute inset-0 z-0">
        {/* Parallax layer (the hook transforms this div; the image fills it). */}
        <div
          ref={bgRef}
          className="absolute inset-0 scale-[1.05] transition-transform duration-[10000ms] ease-out group-hover:scale-100"
        >
          {/* Atmospheric backdrop (decorative) — but it IS the LCP: priority. */}
          <TenantImage
            src={hero.backgroundImage}
            alt=""
            priority
            sizes="100vw"
            className="object-center brightness-50 contrast-[1.1]"
          />
          {/* The gradient that used to be the first background layer. */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.3)_0%,rgba(10,10,10,0.6)_50%,rgba(10,10,10,0.9)_100%)]" />
        </div>
      </div>

      <div className="absolute -right-[100px] -top-[200px] z-[1] h-[600px] w-[600px] animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.08)_0%,transparent_70%)] max-[768px]:-right-[80px] max-[768px]:-top-[100px] max-[768px]:h-[300px] max-[768px]:w-[300px]" />

      <div className="site-container relative z-[2] pt-24 max-[768px]:py-20">
        <div className="reveal mb-8 inline-flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[5px] text-gold before:h-px before:w-[50px] before:bg-gold before:content-[''] max-[768px]:mb-5 max-[768px]:before:w-[30px]">
          {hero.overline}
        </div>

        <h1 className="reveal reveal-delay-1 max-w-[900px] font-heading text-[clamp(3.5rem,10vw,9rem)] leading-[0.95] tracking-[4px] text-white max-[480px]:text-[clamp(2.8rem,12vw,4.5rem)]">
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

        <p className="reveal reveal-delay-2 mt-8 max-w-[480px] text-base font-light leading-[1.8] text-gray-light max-[768px]:mt-5 max-[768px]:text-[0.9rem]">
          {hero.description}
        </p>

        <div className="reveal reveal-delay-3 mt-10 flex flex-wrap gap-5 max-[768px]:mt-7 max-[768px]:flex-col">
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

        <div className="reveal reveal-delay-4 mt-16 flex gap-12 border-t border-dark-border pt-8 max-[1024px]:gap-8 max-[768px]:mt-10 max-[768px]:flex-wrap max-[768px]:gap-6 max-[768px]:pt-6 max-[480px]:flex-row max-[480px]:justify-between">
          {hero.stats.map((stat) => (
            <div key={stat.label}>
              <h3 className="font-heading text-[2.5rem] tracking-[2px] text-gold max-[768px]:text-[2rem] max-[480px]:text-[1.6rem]">
                {stat.value}
              </h3>
              <p className="mt-1 text-[0.7rem] uppercase tracking-[3px] text-gray max-[768px]:text-[0.6rem] max-[768px]:tracking-[2px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-3 max-[768px]:hidden">
        <span className="text-[0.6rem] uppercase tracking-[3px] text-gray">
          Scroll
        </span>
        <div className="relative h-10 w-px overflow-hidden bg-dark-border after:absolute after:-top-full after:h-full after:w-full after:animate-scroll-anim after:bg-gold after:content-['']" />
      </div>
    </section>
  );
}
