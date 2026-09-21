"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { useNavScrolled } from "../hooks/use-nav-scrolled";
import { useActiveSection } from "../hooks/use-active-section";
import { Logo } from "../components/logo";
import { BtnGold } from "../components/buttons";

/**
 * The fixed header, and the full-screen drawer behind it on small screens.
 *
 * Transparent over the hero and settling into frosted cream past 50px, exactly
 * as the mockup does. The hamburger morphs into a cross through the same three
 * spans — a transform per bar rather than swapping icons, so the motion is
 * continuous.
 */
export function SiteHeader({ business }: { business: BusinessProfile }) {
  const scrolled = useNavScrolled();
  const active = useActiveSection(business.nav.map((link) => link.href));
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          // While the drawer is up the header sits ON it, so it keeps the
          // transparent treatment even if the page beneath has scrolled.
          scrolled && !open && "nav-scrolled",
        )}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between lg:h-24">
            <Logo business={business} />

            <div className="hidden items-center gap-10 lg:flex">
              {business.nav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={active === link.href ? "true" : undefined}
                  className={cn(
                    "nav-link text-sm font-medium uppercase tracking-widest transition-colors",
                    active === link.href
                      ? "text-gold-500"
                      : "text-charcoal/70 hover:text-gold-500",
                  )}
                >
                  {link.label}
                </a>
              ))}
              <BtnGold href={business.navCta.href} className="px-7 py-3">
                {business.navCta.label}
              </BtnGold>
            </div>

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="events-drawer"
              onClick={() => setOpen((v) => !v)}
              className="relative z-50 flex h-10 w-10 items-center justify-center lg:hidden"
            >
              <span className="flex flex-col gap-1.5">
                <span
                  className={cn(
                    "block h-0.5 w-6 origin-center bg-charcoal transition-all duration-300",
                    open && "translate-x-[4px] translate-y-[4px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "block h-0.5 w-6 bg-charcoal transition-all duration-300",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "block h-0.5 origin-center bg-charcoal transition-all duration-300",
                    open
                      ? "w-6 translate-x-[4px] -translate-y-[4px] -rotate-45"
                      : "w-4",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/*
       * The drawer.
       *
       * Always rendered and hidden with `visibility` rather than unmounted —
       * which is what lets it fade rather than appear. Hidden visibility
       * already removes it from the tab order and the accessibility tree;
       * `inert` says the same to browsers that support it, and neither depends
       * on script having run.
       */}
      <div
        id="events-drawer"
        inert={!open}
        className={cn(
          // `overflow-y-auto`: the links are set at 2.25rem, so a longer menu
          // on a short phone runs past the bottom edge with no way to reach it.
          "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-cream transition-opacity duration-500",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center"
        >
          <X aria-hidden="true" className="h-6 w-6 text-charcoal" />
        </button>

        <div className="space-y-8 py-24 text-center">
          {business.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block font-serif text-4xl text-charcoal transition-colors hover:text-gold-500"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-6">
            <BtnGold
              href={business.navCta.href}
              onClick={() => setOpen(false)}
              className="px-10 py-4"
            >
              {business.navCta.label}
            </BtnGold>
          </div>
        </div>
      </div>
    </>
  );
}
