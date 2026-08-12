"use client";

import { useEffect, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { useHeaderScroll } from "../hooks/use-header-scroll";
import { useActiveSection } from "../hooks/use-active-section";
import { Logo } from "../components/logo";
import { Arrow } from "../components/buttons";
import { HERO_STAGE_ID } from "./hero";

export function SiteHeader({ business }: { business: BusinessProfile }) {
  const stuck = useHeaderScroll(`#${HERO_STAGE_ID}`);
  const active = useActiveSection(business.nav.map((link) => link.href));
  const [open, setOpen] = useState(false);
  const place = business.retreat?.place;

  // Escape closes the drawer, and the page behind it doesn't scroll while it is
  // up. Both are cleaned up on close so a stuck `overflow` can't outlive it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // While the drawer is up the header sits ON it, so it keeps the ivory-on-dark
  // treatment even if the page beneath has scrolled past the hero.
  const onDark = !stuck || open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-[background-color,box-shadow,backdrop-filter] duration-[600ms] ease-[cubic-bezier(.22,.61,.36,1)]",
          stuck &&
            !open &&
            "bg-[rgba(245,241,232,0.9)] shadow-[0_1px_0_rgba(32,33,30,0.09)] backdrop-blur-[14px] backdrop-saturate-150",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[var(--lodge-shell)] items-center justify-between gap-8 px-[var(--lodge-gutter)] transition-[padding] duration-[600ms] ease-[cubic-bezier(.22,.61,.36,1)]",
            stuck && !open ? "py-4" : "py-[1.45rem]",
          )}
        >
          <Logo
            business={business}
            onDark={onDark}
            wordClassName={cn(
              stuck && !open ? "text-[1.28rem]" : "lodge-on-photo",
            )}
          />

          <nav aria-label="Primary" className="hidden items-center gap-[clamp(1.4rem,2.6vw,2.6rem)] min-[961px]:flex">
            {business.nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={active === link.href ? "true" : undefined}
                className={cn(
                  "relative py-[0.3rem] text-[0.735rem] font-medium uppercase tracking-[0.14em] transition-colors duration-500",
                  // The rule is drawn from the right on the way in and retracts
                  // to the right on the way out (mockup transform-origin swap).
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(.22,.61,.36,1)] after:content-['']",
                  "hover:after:origin-left hover:after:scale-x-100 aria-[current=true]:after:origin-left aria-[current=true]:after:scale-x-100",
                  // Unstuck, these 11px caps sit on the photograph with only
                  // the scrim's top band behind them.
                  onDark
                    ? "lodge-on-photo text-[rgba(245,241,232,0.95)]"
                    : "text-bark",
                )}
              >
                {link.label}
              </a>
            ))}

            <a
              href={business.navCta.href}
              className={cn(
                "whitespace-nowrap rounded-[2px] border px-[1.35rem] py-[0.78rem] text-[0.685rem] font-semibold uppercase tracking-[0.16em] transition-[background-color,color,border-color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]",
                onDark
                  ? "lodge-on-photo border-[rgba(245,241,232,0.6)] text-ivory hover:border-ivory hover:bg-ivory hover:text-bark hover:[text-shadow:none]"
                  : "border-bark text-bark hover:bg-bark hover:text-ivory",
              )}
            >
              {business.navCta.label}
            </a>
          </nav>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="lodge-drawer"
            onClick={() => setOpen((v) => !v)}
            className="-mr-[10px] flex h-[46px] w-[46px] flex-col items-center justify-center gap-[6px] min-[961px]:hidden"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "block h-px w-6 transition-[transform,opacity,background-color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]",
                  onDark ? "bg-ivory" : "bg-bark",
                  open && i === 0 && "translate-y-[3.5px] rotate-45",
                  open && i === 1 && "opacity-0",
                  open && i === 2 && "-translate-y-[3.5px] -rotate-45",
                )}
              />
            ))}
          </button>
        </div>
      </header>

      {/*
       * The mobile drawer.
       *
       * Always rendered, hidden with `visibility` rather than the `hidden`
       * attribute — which is what lets it fade rather than appear. Hidden
       * visibility already removes it from the tab order and the accessibility
       * tree; `inert` says the same thing to browsers that support it, and
       * neither depends on script having run.
       */}
      <div
        id="lodge-drawer"
        inert={!open}
        className={cn(
          // `overflow-y-auto` because the drawer is a fixed full-screen panel:
          // its links are set at up to 2.9rem, so a longer menu on a short
          // phone runs past the bottom edge with no way to reach the end.
          "fixed inset-0 z-[95] flex flex-col justify-between overflow-y-auto overscroll-contain bg-bark px-[var(--lodge-gutter)] pb-12 pt-[7.5rem] transition-[opacity,transform,visibility] duration-[550ms] ease-[cubic-bezier(.22,.61,.36,1)]",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-[14px] opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-[0.35rem]">
          {business.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-[var(--lodge-rule-invert)] py-[0.35rem] font-lodge text-[clamp(2rem,9vw,2.9rem)] leading-[1.5] text-ivory"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-10 flex flex-col gap-[1.6rem]">
          <a
            href={business.navCta.href}
            onClick={() => setOpen(false)}
            className="group/btn inline-flex min-h-[52px] items-center gap-3 self-start rounded-[2px] border border-ivory bg-ivory px-[1.7rem] py-[0.95rem] text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-bark transition-[background-color,color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-transparent hover:text-ivory"
          >
            {business.navCta.label}
            <Arrow />
          </a>
          {place && (
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.5)]">
              {place.locality} · {place.country}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
