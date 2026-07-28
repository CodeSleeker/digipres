"use client";

import { useEffect, useState } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { useHeaderScroll } from "../hooks/use-header-scroll";
import { Logo } from "../components/logo";

export function SiteHeader({ business }: { business: BusinessProfile }) {
  const scrolled = useHeaderScroll(60);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on Escape and lock body scroll while the panel is open, so keyboard
  // users can dismiss it and the page behind doesn't scroll underneath.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[1000] border-b backdrop-blur-[16px] transition-all duration-[400ms]",
        scrolled
          ? "border-[rgba(201,169,110,0.08)] bg-[rgba(10,10,10,0.92)] py-3"
          : "border-[rgba(201,169,110,0.08)] bg-[rgba(10,10,10,0.7)] py-5",
      )}
    >
      <div className="site-container flex items-center justify-between">
        <Logo business={business} />

        <nav aria-label="Primary">
          <ul className="flex list-none items-center gap-8 max-[768px]:hidden">
            {business.nav.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="relative text-[0.8rem] font-medium uppercase tracking-[2px] text-gray-light transition-colors duration-300 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-[width] after:duration-300 after:content-[''] hover:text-gold hover:after:w-full focus-visible:text-gold focus-visible:outline-none focus-visible:after:w-full"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href={business.navCta.href}
          className="flex min-h-11 items-center bg-gold px-[1.6rem] py-[0.7rem] font-heading text-[0.9rem] tracking-[2px] text-black transition-all duration-300 hover:-translate-y-px hover:bg-gold-light hover:shadow-[0_4px_20px_rgba(201,169,110,0.3)] focus-visible:-translate-y-px focus-visible:shadow-[0_4px_20px_rgba(201,169,110,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-[768px]:hidden"
        >
          {business.navCta.label}
        </a>

        <button
          type="button"
          className="hidden cursor-pointer flex-col gap-[5px] border-none bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold max-[768px]:flex"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={cn(
              "h-0.5 w-6 bg-gold transition-all duration-300",
              menuOpen && "translate-y-[7px] rotate-45",
            )}
          />
          <span
            className={cn(
              "h-0.5 w-6 bg-gold transition-all duration-300",
              menuOpen && "opacity-0",
            )}
          />
          <span
            className={cn(
              "h-0.5 w-6 bg-gold transition-all duration-300",
              menuOpen && "-translate-y-[7px] -rotate-45",
            )}
          />
        </button>
      </div>

      {/* Mobile navigation panel — the same links + CTA the desktop bar shows.
          `hidden` keeps it out of the a11y tree and tab order while closed. */}
      <div
        id="mobile-nav"
        hidden={!menuOpen}
        className="hidden border-t border-[rgba(201,169,110,0.12)] bg-[rgba(10,10,10,0.98)] backdrop-blur-[16px] max-[768px]:block"
      >
        <nav aria-label="Mobile">
          <ul className="site-container flex list-none flex-col gap-1 py-4">
            {business.nav.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-sm font-medium uppercase tracking-[2px] text-gray-light transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={business.navCta.href}
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-11 items-center justify-center bg-gold px-[1.6rem] py-3 font-heading text-[0.9rem] tracking-[2px] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {business.navCta.label}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
