"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The chrome shared by /admin and /platform: pinned sidebar, header, content.
 *
 * One component rather than two near-identical layouts, because the responsive
 * behaviour is the fiddly part and having it in two places guarantees they drift.
 * Everything tenant- or role-specific arrives as props, and those props are
 * server-rendered nodes — the nav still queries the pending-booking count and the
 * template's sections on the server. Only the open/closed state is client-side.
 *
 * Desktop (>=lg) is deliberately IDENTICAL to what this replaced: a `sticky`,
 * `self-start`, `h-screen`, `w-60` aside and `p-8` content. Every mobile rule is
 * expressed as the base case with an `lg:` override restoring the old value, so
 * the wide layout cannot drift as a side effect of a phone fix.
 */
export function DashboardShell({
  brandLabel,
  brandHref,
  nav,
  navFooter,
  headerLeft,
  headerRight,
  banner,
  children,
}: {
  brandLabel: string;
  brandHref: string;
  /** The <Link> list. Server-rendered. */
  nav: React.ReactNode;
  /** Pinned to the bottom of the sidebar (alerts, sound, escape hatches). */
  navFooter?: React.ReactNode;
  headerLeft: React.ReactNode;
  headerRight: React.ReactNode;
  /** Full-width strip above the header, e.g. the impersonation banner. */
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer when navigation happens. Adjusting state during render
  // rather than in an effect: the drawer must never paint open over the new
  // page, and this is the pattern React documents for deriving from a prop
  // change (an effect here would also trip react-hooks/set-state-in-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape closes, and the page behind the overlay must not scroll — on iOS a
  // scrollable body under a fixed overlay is what makes a drawer feel broken.
  //
  // Widening past lg also closes it. Without that, opening the drawer on a
  // phone and then rotating (or dragging a desktop window wider) leaves `open`
  // true: the drawer itself is fine, since lg pins it anyway, but the body
  // scroll lock below would stay applied to a desktop page with no way to clear
  // it. The media query is the same 1024px as the `lg:` classes.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Backdrop. Mobile only, and only while open — `lg:hidden` alone would
          leave it catching clicks on desktop if the state were ever true. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
        Off-canvas below lg, pinned column at lg and above.

        `self-start` is load-bearing on desktop: a flex item stretches to the
        row's height by default, and an element already as tall as its container
        has nothing to stick to. `overflow-y-auto` keeps a long nav (many
        features + every template section) reachable on short screens.
      */}
      <aside
        id="dashboard-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-r border-dark-border bg-black p-6 transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:max-w-none lg:translate-x-0 lg:self-start lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href={brandHref}
            className="font-heading text-lg tracking-[2px] text-gold"
          >
            {brandLabel}
          </Link>
          {/* A real button rather than relying on the backdrop: the backdrop is
              invisible to a screen reader and unreachable by keyboard. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-2 flex h-9 w-9 items-center justify-center text-xl text-gray transition-colors hover:text-gold lg:hidden"
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        {nav}

        {navFooter && (
          <div className="mt-auto flex flex-col gap-2">{navFooter}</div>
        )}
      </aside>

      {/*
        `min-w-0` is the fix for the horizontal page scroll.

        A flex item's min-width defaults to `auto`, meaning "at least as wide as
        my content". Without this the column grows to fit a 760px table and the
        WHOLE page pans sideways — which is why every `overflow-x-auto` wrapper
        in here looked like it did nothing. With it, the wrappers scroll instead.
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        {banner}

        <header className="flex items-center gap-3 border-b border-dark-border px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center text-gray-light transition-colors hover:text-gold lg:hidden"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="dashboard-nav"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>

          {/* min-w-0 again: a long business name or email must ellipsis, not
              push the log-out button off the screen. */}
          <div className="flex min-w-0 flex-1 flex-col">{headerLeft}</div>

          <div className="shrink-0">{headerRight}</div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * A sidebar link. Exists so the mobile tap target is generous (44px-ish) while
 * desktop keeps the original tight `py-1` rhythm — a plain `py-2.5` everywhere
 * would visibly loosen the desktop nav.
 */
export function NavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`py-2.5 text-gray-light transition-colors hover:text-gold lg:py-1 ${className}`}
    >
      {children}
    </Link>
  );
}
