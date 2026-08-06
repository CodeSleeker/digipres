"use client";

import { useEffect, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { usePageScroll } from "../hooks/use-page-scroll";
import { useActiveSection } from "../hooks/use-active-section";
import { Logo } from "../components/logo";
import { Btn } from "../components/buttons";

export function SiteHeader({ business }: { business: BusinessProfile }) {
  const { progress, stuck } = usePageScroll();
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
      {/* Reading progress. Decorative — the same information is in the
          scrollbar, so it is hidden from assistive tech rather than announced
          as a progressbar nobody asked for. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[120] h-0.5 origin-left bg-[linear-gradient(90deg,var(--color-mint),var(--color-warm),var(--color-pink))]"
        style={{ transform: `scaleX(${progress})` }}
      />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[110] flex items-center border-b transition-[height,background-color,box-shadow,border-color] duration-[450ms]",
          stuck
            ? "h-16 border-[var(--pastry-line-soft)] bg-[rgba(255,253,248,0.97)] shadow-[0_10px_34px_-26px_rgba(47,42,38,0.5)] min-[769px]:bg-[rgba(255,253,248,0.72)] min-[769px]:backdrop-blur-[18px] min-[769px]:backdrop-saturate-[165%]"
            : "h-[var(--pastry-nav-h)] border-transparent bg-transparent",
        )}
      >
        <div className="pastry-shell flex items-center gap-8">
          <Logo business={business} className="mr-auto" />

          <nav aria-label="Primary" className="max-[1000px]:hidden">
            <ul className="flex list-none items-center gap-[0.35rem]">
              {business.nav.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active === link.href ? "true" : undefined}
                    className={cn(
                      "relative block rounded-full px-[0.85rem] py-2 text-[0.85rem] font-medium transition-colors duration-300",
                      "after:absolute after:bottom-[0.28rem] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-warm-deep after:opacity-0 after:transition-opacity after:duration-300 after:content-['']",
                      "hover:bg-[rgba(47,42,38,0.045)] hover:text-ink",
                      active === link.href
                        ? "text-ink after:opacity-100"
                        : "text-ink-70",
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-[0.6rem]">
            <Btn
              href={business.navCta.href}
              size="sm"
              arrow={business.navCta.arrow}
              className="max-[1000px]:hidden"
            >
              {business.navCta.label}
            </Btn>

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="pastry-drawer"
              onClick={() => setOpen((v) => !v)}
              className="hidden h-[42px] w-[42px] cursor-pointer place-content-center rounded-full border border-[var(--pastry-line)] bg-[rgba(255,255,255,0.6)] p-0 max-[1000px]:grid"
            >
              <span
                className={cn(
                  "block h-[1.5px] w-[17px] rounded-sm bg-ink transition-transform duration-[400ms]",
                  open && "translate-y-[5.5px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "mt-1 block h-[1.5px] w-[17px] rounded-sm bg-ink transition-opacity duration-[250ms]",
                  open && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "mt-1 block h-[1.5px] w-[17px] rounded-sm bg-ink transition-transform duration-[400ms]",
                  open && "-translate-y-[5.5px] -rotate-45",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer. `hidden` (not just opacity) keeps it out of the tab
          order and the accessibility tree while closed. */}
      <div
        id="pastry-drawer"
        hidden={!open}
        className={cn(
          "fixed inset-x-0 z-[105] border-b border-[var(--pastry-line)] bg-[rgba(255,253,248,0.97)] pb-7 pt-4 backdrop-blur-[20px]",
          stuck ? "top-16" : "top-[var(--pastry-nav-h)]",
          "min-[1001px]:hidden",
        )}
      >
        <nav aria-label="Mobile" className="pastry-shell">
          {business.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-[var(--pastry-line-soft)] px-1 py-[0.95rem] text-[1.05rem] text-ink"
            >
              {link.label}
              <span aria-hidden="true">›</span>
            </a>
          ))}
          <Btn
            href={business.navCta.href}
            onClick={() => setOpen(false)}
            className="mt-[1.35rem] w-full"
          >
            {business.navCta.label}
          </Btn>
        </nav>
      </div>
    </>
  );
}
