import { Star } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHead } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * What clients said.
 *
 * Renders nothing without testimonials: a heading over an empty grid reads as
 * a site that lost its content, and a new studio with no reviews yet is better
 * served by the section simply not being there.
 */
export function Testimonials({ business }: { business: BusinessProfile }) {
  const { testimonials } = business;
  if (!testimonials.items.length) return null;

  return (
    <section
      id="testimonials"
      className="relative bg-gradient-to-b from-gold-50/50 to-cream py-28 lg:py-40"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <SectionHead heading={testimonials.heading} className="mb-20" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.items.map((item, i) => (
            <figure
              key={`${item.author}-${item.meta}`}
              className={cn(
                reveal(),
                "testimonial-card hover-lift rounded-2xl p-8",
                // Three cards on a two-column grid leave one orphan; the
                // mockup spans it so the row reads as deliberate.
                i === 2 && "md:col-span-2 lg:col-span-1",
              )}
              style={delay(100 * ((i % 3) + 1))}
            >
              <Rating value={item.rating} />

              <blockquote className="mb-8 italic leading-relaxed text-charcoal/70">
                {`"${item.text}"`}
              </blockquote>

              <figcaption className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 font-serif font-semibold text-gold-600"
                >
                  {item.initials}
                </span>
                <span className="block">
                  <span className="block text-sm font-semibold">
                    {item.author}
                  </span>
                  <span className="block text-xs text-charcoal/50">
                    {item.meta}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The star row.
 *
 * Drawn as five glyphs but announced as one string: a screen reader meeting
 * five identical "star" labels learns nothing, where "Rated 5 out of 5" is the
 * fact the row exists to convey.
 */
function Rating({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div className="mb-6 flex gap-1">
      <span className="sr-only">{`Rated ${filled} out of 5`}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            "h-4 w-4",
            i < filled ? "fill-gold-500 text-gold-500" : "text-gold-500/25",
          )}
        />
      ))}
    </div>
  );
}
