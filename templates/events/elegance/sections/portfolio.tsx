import { ArrowRight } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { FilterLink } from "../components/filter-link";
import { SectionHead } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * The three tall category cards under the hero.
 *
 * Photography first: the copy sits inside the frame under a gradient rather
 * than beneath it, so the picture is the full card and nothing crops it. The
 * "View gallery" line appears on hover on a pointer device — and, because it
 * is inside the link, on keyboard focus too, which a hover-only reveal would
 * leave unreachable.
 *
 * Renders nothing without cards: three empty frames are worse than no strip.
 */
export function Portfolio({ business }: { business: BusinessProfile }) {
  const portfolio = business.events?.portfolio;
  if (!portfolio?.items.length) return null;

  const { heading, items } = portfolio;

  return (
    <section id="portfolio" className="relative py-24 lg:py-36">
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-gold-100/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <SectionHead heading={heading} className="mb-20" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <FilterLink
              key={item.title}
              href="#events"
              // Narrows the grid below to this category on the way down.
              filter={item.filter}
              className={cn(
                reveal(),
                "hover-lift group block",
                // Three cards on a two-column grid leave one orphan; the
                // mockup spans it, so the row reads as deliberate.
                i === 2 && "md:col-span-2 lg:col-span-1",
              )}
              style={delay(100 * (i + 1))}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <TenantImage
                  src={item.image}
                  alt={item.alt ?? item.title}
                  sizes="(max-width: 768px) 92vw, (max-width: 1024px) 46vw, 30vw"
                  className="transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                    {item.label}
                  </p>
                  <h3 className="mb-3 font-serif text-3xl font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/70">
                    {item.description}
                  </p>
                  <span className="mt-5 flex items-center gap-2 text-sm font-medium text-gold-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    View gallery
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </FilterLink>
          ))}
        </div>
      </div>
    </section>
  );
}
