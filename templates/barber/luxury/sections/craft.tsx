"use client";

import { useRef } from "react";
import type { BusinessProfile, CraftLabelPosition } from "@/types/business";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";
import { ButtonLink } from "../components/buttons";
import {
  SectionLabel,
  SectionSubtitle,
  SectionTitle,
} from "../components/section-heading";
import { useCraftScroll } from "../hooks/use-craft-scroll";

/**
 * Rotating tools (assembled → separated on scroll). `data-craft-*` attributes
 * drive useCraftScroll; the `craft-tool*` marker classes let the hook locate
 * elements. Structural (not business) content, so tool glyphs live here.
 */
const TOOLS = [
  {
    icon: "⚡",
    marker: "craft-tool--clippers",
    position:
      "top-5 left-1/2 -translate-x-1/2 max-[768px]:top-[10px] max-[480px]:top-[5px]",
    speed: "1.2",
    dir: "y",
    sign: "-1",
  },
  {
    icon: "✂",
    marker: "craft-tool--scissors",
    position:
      "top-1/2 left-5 -translate-y-1/2 max-[768px]:left-[10px] max-[480px]:left-[5px]",
    speed: "1.0",
    dir: "x",
    sign: "-1",
  },
  {
    icon: "🪒",
    marker: "craft-tool--razor",
    position:
      "top-1/2 right-5 -translate-y-1/2 max-[768px]:right-[10px] max-[480px]:right-[5px]",
    speed: "0.8",
    dir: "x",
    sign: "1",
  },
  {
    icon: "▥",
    marker: "craft-tool--comb",
    position:
      "bottom-5 left-1/2 -translate-x-1/2 max-[768px]:bottom-[10px] max-[480px]:bottom-[5px]",
    speed: "1.1",
    dir: "y",
    sign: "1",
  },
] as const;

const LABEL_POSITION: Record<CraftLabelPosition, string> = {
  top: "craft-label--top top-[13%] left-1/2 -translate-x-1/2 text-center max-[480px]:top-[10%]",
  left: "craft-label--left top-1/2 left-[20%] -translate-y-1/2 max-[768px]:left-[4%]",
  right:
    "craft-label--right top-1/2 right-[20%] -translate-y-1/2 text-right max-[768px]:right-[4%]",
  bottom:
    "craft-label--bottom bottom-[8%] left-1/2 -translate-x-1/2 text-center max-[480px]:bottom-[12%]",
};

export function Craft({ business }: { business: BusinessProfile }) {
  const { craft } = business;
  const sectionRef = useRef<HTMLElement>(null);
  useCraftScroll(sectionRef);

  return (
    <section
      ref={sectionRef}
      id="craft"
      className="relative h-[300vh] bg-black max-[768px]:h-[250vh] max-[480px]:h-[220vh]"
    >
      <div className="craft-sticky sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.06)_0%,transparent_70%)]" />

        {/* Header */}
        <div className="craft-header absolute inset-x-0 top-[clamp(5rem,12vh,8rem)] z-[5] text-center will-change-[transform,opacity]">
          <SectionLabel centered>{craft.label}</SectionLabel>
          <SectionTitle className="text-center">{craft.title}</SectionTitle>
          <SectionSubtitle className="text-center">
            {craft.subtitle}
          </SectionSubtitle>
        </div>

        {/* Rings */}
        <div className="craft-ring pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.12] will-change-[transform,opacity] max-[768px]:h-[120px] max-[768px]:w-[120px] max-[480px]:h-[90px] max-[480px]:w-[90px]" />
        <div className="craft-ring craft-ring--outer pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.06] will-change-[transform,opacity] max-[768px]:h-[180px] max-[768px]:w-[180px] max-[480px]:h-[140px] max-[480px]:w-[140px]" />

        {/* Portrait crossfade */}
        <div className="craft-portrait pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full will-change-transform max-[768px]:h-[120px] max-[768px]:w-[120px] max-[480px]:h-[90px] max-[480px]:w-[90px]">
          {/* Decorative crossfade flourish (pointer-events-none): alt="". */}
          <TenantImage
            src={craft.portraitBefore}
            alt=""
            sizes="160px"
            className="object-center"
          />
          <div className="craft-portrait-img--after absolute inset-0 opacity-0 will-change-[opacity]">
            <TenantImage
              src={craft.portraitAfter}
              alt=""
              sizes="160px"
              className="object-center"
            />
          </div>
        </div>

        {/* Cross lines */}
        <div className="craft-line craft-line--h absolute left-1/2 top-1/2 z-[1] h-px w-0 -translate-x-1/2 bg-gold/[0.08] will-change-[transform,opacity]" />
        <div className="craft-line craft-line--v absolute left-1/2 top-1/2 z-[1] h-0 w-px -translate-y-1/2 bg-gold/[0.08] will-change-[transform,opacity]" />

        {/* Tools */}
        <div className="relative z-[3] h-[320px] w-[320px] max-[1024px]:h-[260px] max-[1024px]:w-[260px] max-[768px]:h-[200px] max-[768px]:w-[200px] max-[480px]:h-[160px] max-[480px]:w-[160px]">
          {TOOLS.map((tool) => (
            <div
              key={tool.marker}
              className={cn(
                "craft-tool absolute flex flex-col items-center justify-center will-change-[transform,opacity]",
                tool.marker,
                tool.position,
              )}
              data-craft-speed={tool.speed}
              data-craft-dir={tool.dir}
              data-craft-sign={tool.sign}
            >
              <div className="craft-tool-icon flex h-20 w-20 items-center justify-center border border-dark-border bg-dark text-[2rem] text-gold shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] max-[1024px]:h-[68px] max-[1024px]:w-[68px] max-[1024px]:text-[1.7rem] max-[768px]:h-14 max-[768px]:w-14 max-[768px]:text-[1.4rem] max-[480px]:h-12 max-[480px]:w-12 max-[480px]:text-[1.2rem]">
                {tool.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Service labels */}
        {craft.labels.map((label) => (
          <div
            key={label.position}
            className={cn(
              "craft-service-label pointer-events-none absolute z-[4] opacity-0 will-change-[transform,opacity]",
              LABEL_POSITION[label.position],
            )}
          >
            <h4 className="mb-[0.35rem] font-heading text-[1.3rem] tracking-[3px] text-white max-[1024px]:text-[1.1rem] max-[768px]:text-[0.95rem] max-[768px]:tracking-[2px] max-[480px]:text-[0.85rem]">
              {label.title}
            </h4>
            <p className="max-w-[180px] text-[0.75rem] leading-[1.5] tracking-[1px] text-gray max-[1024px]:max-w-[150px] max-[1024px]:text-[0.7rem] max-[768px]:max-w-[120px] max-[768px]:text-[0.65rem] max-[480px]:hidden">
              {label.description}
            </p>
          </div>
        ))}

        {/* CTA */}
        <div className="craft-cta absolute inset-x-0 bottom-[clamp(3rem,8vh,5rem)] z-[5] translate-y-5 text-center opacity-0 will-change-[transform,opacity]">
          <p className="mb-6 font-display text-[1.1rem] italic text-gray max-[768px]:text-[0.95rem]">
            {craft.ctaText}
          </p>
          <ButtonLink href={craft.cta.href} arrow={craft.cta.arrow}>
            {craft.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
