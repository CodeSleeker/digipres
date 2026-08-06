import type { AccentTone, BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHead } from "../components/section-head";
import { stagger } from "../lib/reveal";

/** Tint per card, by position — see the note in featured.tsx. */
const TONES: AccentTone[] = ["mint", "warm", "pink"];

const TONE_CLASS: Record<AccentTone, { rule: string; mark: string }> = {
  mint: { rule: "bg-mint", mark: "text-mint" },
  warm: { rule: "bg-warm", mark: "text-warm" },
  pink: { rule: "bg-pink", mark: "text-pink" },
};

export function Testimonials({ business }: { business: BusinessProfile }) {
  const { testimonials } = business;
  if (!testimonials.items.length) return null;

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-beige py-[var(--pastry-section)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[120px] -top-[160px] z-0 h-[460px] w-[460px] rounded-full bg-pink opacity-[0.14] blur-[70px]"
      />
      <div className="pastry-shell relative z-[1]">
        <SectionHead heading={testimonials.heading} />

        <div className="mt-[clamp(2.5rem,2rem+2vw,3.5rem)] grid grid-cols-3 gap-6 max-[980px]:max-w-[620px] max-[980px]:grid-cols-1">
          {testimonials.items.map((item, i) => {
            const tone = TONE_CLASS[TONES[i % TONES.length]!];
            return (
              <figure
                key={item.author}
                className="reveal relative m-0 flex flex-col rounded-[30px] border border-[var(--pastry-line-soft)] bg-snow px-[1.85rem] pb-[1.85rem] pt-[2.1rem] shadow-[var(--pastry-sh-sm)] transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1.5 hover:shadow-[var(--pastry-sh-md)]"
                style={stagger(i)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-8 top-0 h-[3px] rounded-b",
                    tone.rule,
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mb-[0.9rem] font-display text-[3.2rem] leading-[0.6] opacity-55",
                    tone.mark,
                  )}
                >
                  &ldquo;
                </span>
                {/* The rating is stated in words for anyone who can't see the
                    card's ornament, and the stars stay decorative. */}
                <span className="sr-only">
                  Rated {item.rating} out of 5.
                </span>
                <blockquote className="m-0 text-[0.985rem] leading-[1.72] text-ink-70">
                  {item.text}
                </blockquote>
                <figcaption className="mt-[1.6rem] flex items-center gap-[0.85rem] border-t border-[var(--pastry-line-soft)] pt-[1.35rem]">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 flex-none place-content-center rounded-full bg-beige font-display text-[0.95rem] text-ink"
                  >
                    {item.initials}
                  </span>
                  <span>
                    <b className="block text-[0.9rem] font-semibold text-ink">
                      {item.author}
                    </b>
                    <small className="text-[0.75rem] text-ink-45">
                      {item.meta}
                    </small>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
