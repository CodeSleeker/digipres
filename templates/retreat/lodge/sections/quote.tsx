import type { BusinessProfile } from "@/types/business";
import { stagger } from "../lib/reveal";

/**
 * The brand statement between the location and the booking CTA.
 *
 * Template copy, NOT a testimonial: nobody said it, and putting it in the
 * testimonials section would invite an owner to add more "quotes" of the same
 * kind — which is how a review section stops meaning anything.
 */
export function Quote({ business }: { business: BusinessProfile }) {
  const quote = business.retreat?.quote;
  if (!quote) return null;

  return (
    <section
      aria-label="Brand statement"
      className="relative z-[1] bg-ivory py-[var(--lodge-section-lg)] text-center"
    >
      <div className="lodge-shell">
        <figure>
          <span
            aria-hidden="true"
            className="reveal mx-auto mb-[2.8rem] block h-16 w-px bg-[var(--lodge-rule)]"
          />
          <blockquote
            className="reveal mx-auto max-w-[19ch] font-lodge text-[clamp(1.85rem,4.4vw,4rem)] font-light italic leading-[1.22] tracking-[-0.01em] text-bark max-[720px]:max-w-[14ch]"
            style={stagger(1)}
          >
            {`“${quote.text}”`}
          </blockquote>
          <figcaption
            className="reveal mt-[2.6rem] text-[0.66rem] uppercase tracking-[0.24em] text-sage"
            style={stagger(2)}
          >
            {quote.attribution}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
