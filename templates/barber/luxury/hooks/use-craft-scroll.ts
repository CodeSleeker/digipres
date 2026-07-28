"use client";

import { useEffect, type RefObject } from "react";

/**
 * "The Craft" scroll-driven storytelling.
 *
 * Ported verbatim from the mockup's rAF loop: maps the section's scroll
 * progress to tool separation, ring/portrait scaling, portrait crossfade,
 * label fades, and the header/CTA slides. Elements are located within the
 * section by their marker classes (kept from the source for this purpose).
 */
export function useCraftScroll(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tools = section.querySelectorAll<HTMLElement>(".craft-tool");
    const labels =
      section.querySelectorAll<HTMLElement>(".craft-service-label");
    const ctaEl = section.querySelector<HTMLElement>(".craft-cta");
    const headerEl = section.querySelector<HTMLElement>(".craft-header");
    const ringInner = section.querySelector<HTMLElement>(
      ".craft-ring:not(.craft-ring--outer)",
    );
    const ringOuter = section.querySelector<HTMLElement>(".craft-ring--outer");
    const lineH = section.querySelector<HTMLElement>(".craft-line--h");
    const lineV = section.querySelector<HTMLElement>(".craft-line--v");
    const portraitContainer =
      section.querySelector<HTMLElement>(".craft-portrait");
    const portraitAfter = section.querySelector<HTMLElement>(
      ".craft-portrait-img--after",
    );

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const maxSpread = isMobile ? 90 : 160;

    let raf = 0;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / sectionHeight));

      // Eased progress for smoother motion
      const ease =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Tool separation
      tools.forEach((tool) => {
        const speed = parseFloat(tool.dataset.craftSpeed ?? "") || 1;
        const dir = tool.dataset.craftDir;
        const sign = parseFloat(tool.dataset.craftSign ?? "") || 1;
        const dist = ease * maxSpread * speed * sign;
        const rotate = ease * 8 * sign;

        if (dir === "x") {
          tool.style.transform = `translateY(-50%) translateX(${dist}px) rotate(${rotate}deg)`;
        } else {
          tool.style.transform = `translateX(-50%) translateY(${dist}px) rotate(${rotate}deg)`;
        }

        // Tool icon glow at full separation
        const icon = tool.querySelector<HTMLElement>(".craft-tool-icon");
        if (icon) {
          const glowOpacity = Math.max(0, (ease - 0.3) / 0.7);
          icon.style.borderColor = `rgba(201,169,110,${0.15 + glowOpacity * 0.4})`;
          icon.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 ${glowOpacity * 20}px rgba(201,169,110,${glowOpacity * 0.15})`;
        }
      });

      // Labels fade in from progress 0.25 → 0.6
      const labelProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.35));
      labels.forEach((label) => {
        label.style.opacity = String(labelProgress);
        const shift = (1 - labelProgress) * 15;
        if (label.classList.contains("craft-label--top")) {
          label.style.transform = `translateX(-50%) translateY(${shift}px)`;
        } else if (label.classList.contains("craft-label--bottom")) {
          label.style.transform = `translateX(-50%) translateY(${-shift}px)`;
        } else if (label.classList.contains("craft-label--left")) {
          label.style.transform = `translateY(-50%) translateX(${shift}px)`;
        } else if (label.classList.contains("craft-label--right")) {
          label.style.transform = `translateY(-50%) translateX(${-shift}px)`;
        }
      });

      // Rings expand
      if (ringInner) {
        const scale = 1 + ease * 0.6;
        ringInner.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${ease * 45}deg)`;
        ringInner.style.opacity = String(1 - ease * 0.5);
      }
      if (ringOuter) {
        const scale = 1 + ease * 0.4;
        ringOuter.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${-ease * 30}deg)`;
        ringOuter.style.opacity = String(1 - ease * 0.6);
      }

      // Portrait scaling syncs with inner ring
      if (portraitContainer) {
        const scale = 1 + ease * 0.6;
        portraitContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      // Portrait crossfade
      if (portraitAfter) {
        const fadeProgress = Math.max(0, Math.min(1, (progress - 0.6) / 0.35));
        portraitAfter.style.opacity = String(fadeProgress);
      }

      // Cross lines expand
      if (lineH) {
        lineH.style.width = `${ease * 70}%`;
        lineH.style.opacity = String(Math.min(1, ease * 2) * 0.5);
      }
      if (lineV) {
        lineV.style.height = `${ease * 60}%`;
        lineV.style.opacity = String(Math.min(1, ease * 2) * 0.5);
      }

      // Header slides left to avoid tool overlap
      if (headerEl) {
        const hSlideMax = isMobile ? 120 : 260;
        const hProgress = Math.max(0, Math.min(1, (progress - 0.03) / 0.45));
        const hEase =
          hProgress < 0.5
            ? 2 * hProgress * hProgress
            : 1 - Math.pow(-2 * hProgress + 2, 2) / 2;
        headerEl.style.opacity = String(1 - hEase * 0.2);
        headerEl.style.transform = `translateX(${-hEase * hSlideMax}px)`;
      }

      // CTA slides right as it appears
      if (ctaEl) {
        const ctaProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.3));
        const cSlideMax = isMobile ? 120 : 260;
        const cEase =
          ctaProgress < 0.5
            ? 2 * ctaProgress * ctaProgress
            : 1 - Math.pow(-2 * ctaProgress + 2, 2) / 2;
        ctaEl.style.opacity = String(ctaProgress);
        ctaEl.style.transform = `translateX(${cEase * cSlideMax}px) translateY(${(1 - ctaProgress) * 20}px)`;
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [sectionRef]);
}
