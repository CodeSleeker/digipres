"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { BtnOutline } from "../components/buttons";
import { EVENT_FILTER } from "../components/filter-link";
import { SectionHead } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * The events actually styled, filterable by category.
 *
 * THE FILTER LIST IS DERIVED, not configured. Categories come from the items
 * themselves in first-appearance order, so adding an event in a new category
 * adds its chip and nothing can list a category with no events behind it — the
 * two cannot disagree because there is only one source.
 *
 * Filtering re-renders the grid rather than hiding cards with CSS. Hidden
 * cards stay in the accessibility tree and the tab order, so a keyboard user
 * lands on events they were told are filtered out.
 */
export function Showcase({ business }: { business: BusinessProfile }) {
  const showcase = business.events?.showcase;
  const [filter, setFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of showcase?.items ?? []) {
      const c = item.category.trim();
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [showcase?.items]);

  // A category card above narrows this grid on its way past. Registered
  // before the early return so the hook order never changes.
  useEffect(() => {
    function onFilter(event: Event) {
      const wanted = (event as CustomEvent<string>).detail?.trim();
      // Only a category the grid can actually show: an event card whose
      // category was renamed would otherwise leave the grid empty with no
      // chip selected and no way back other than reloading.
      if (wanted && categories.includes(wanted)) setFilter(wanted);
    }
    window.addEventListener(EVENT_FILTER, onFilter);
    return () => window.removeEventListener(EVENT_FILTER, onFilter);
  }, [categories]);

  if (!showcase?.items.length) return null;

  const { heading, items, allLabel, cta } = showcase;
  const visible = filter
    ? items.filter((item) => item.category.trim() === filter)
    : items;

  // One category is not a filter, it is a label. Showing a single chip beside
  // "All" invites a click that changes nothing.
  const showFilters = categories.length > 1;

  return (
    <section
      id="events"
      className="relative overflow-hidden bg-gradient-to-b from-cream to-gold-50/30 py-28 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[500px] w-[500px] translate-y-1/2 rounded-full bg-gold-100/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 top-20 h-[300px] w-[300px] rounded-full bg-gold-200/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <SectionHead heading={heading} className="mb-12 lg:mb-16" />

        {showFilters && (
          <div
            className={cn(
              reveal(),
              "mb-12 flex flex-wrap items-center justify-center gap-3",
            )}
            role="group"
            aria-label="Filter events by category"
          >
            <FilterChip
              active={filter === null}
              onClick={() => setFilter(null)}
            >
              {allLabel}
            </FilterChip>
            {categories.map((category) => (
              <FilterChip
                key={category}
                active={filter === category}
                onClick={() => setFilter(category)}
              >
                {category}
              </FilterChip>
            ))}
          </div>
        )}

        {/* The count changes as the filter does, and nothing else on screen
            says so. Announced politely so it doesn't interrupt. */}
        <p aria-live="polite" className="sr-only">
          {`Showing ${visible.length} ${visible.length === 1 ? "event" : "events"}${
            filter ? ` in ${filter}` : ""
          }`}
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => (
            <article
              key={`${item.title}-${item.date}`}
              className={cn(
                reveal(),
                "event-card hover-lift group overflow-hidden rounded-2xl border border-gold-100/60 bg-white",
              )}
              // The stagger restarts per row so a filtered grid doesn't open
              // with a nine-deep cascade.
              style={delay(100 * ((i % 3) + 1))}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <TenantImage
                  src={item.image}
                  alt={item.alt ?? item.title}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                  className="transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-charcoal/20 via-transparent to-transparent"
                />
                <span className="absolute left-4 top-4 rounded-full border border-gold-200/50 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold-700 shadow-sm backdrop-blur-sm">
                  {item.category}
                </span>
              </div>

              <div className="p-6 lg:p-7">
                <h3 className="mb-3 font-serif text-xl font-semibold text-charcoal transition-colors group-hover:text-gold-600 lg:text-2xl">
                  {item.title}
                </h3>
                <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-charcoal/50">
                  {item.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-gold-500"
                      />
                      {item.venue}
                    </span>
                  )}
                  {item.date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-gold-500"
                      />
                      {item.date}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-charcoal/55">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        {cta?.label && (
          <div className={cn(reveal(), "mt-14 text-center")} style={delay(400)}>
            {/*
             * The real home of a stylist's full body of work is usually
             * somewhere else — an Instagram, a gallery page — so an off-site
             * link opens in a new tab rather than navigating away from the
             * page they were reading.
             */}
            <BtnOutline
              href={cta.href}
              className="px-10 py-4"
              {...(/^https?:\/\//i.test(cta.href)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {cta.label}
            </BtnOutline>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300",
        active
          ? "border-gold-500 bg-gold-500 text-charcoal shadow-[0_4px_15px_rgba(201,169,60,0.25)]"
          : "border-gold-200 bg-white/70 text-charcoal/60 hover:border-gold-400 hover:text-gold-600",
      )}
    >
      {children}
    </button>
  );
}
