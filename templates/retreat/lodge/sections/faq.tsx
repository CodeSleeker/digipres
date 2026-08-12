import type { BusinessProfile } from "@/types/business";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The questions a guest asks before they book — amenities, house rules, how to
 * get there.
 *
 * Built on native <details>/<summary> rather than a JS disclosure, following
 * the barber template's own reasoning (see the note there), which holds just as
 * well here:
 *
 *  1. The answers stay in the DOM while collapsed. That is the whole point of
 *     the section — a crawler or answer engine has to be able to read text the
 *     visitor hasn't clicked yet.
 *  2. It stays a server component. No hydration cost for a section that is
 *     nothing but text.
 *  3. Toggle on Enter/Space, focus order and the expanded state announced to
 *     screen readers all come from the browser, correct by construction.
 *
 * Renders NOTHING without questions. The template default ships zero, so an
 * un-customized site shows no empty strip — and `buildFaqJsonLd` is gated on
 * the same list, keeping the markup and the visible page in agreement, as
 * Google's structured-data policy requires.
 */
export function Faq({ business }: { business: BusinessProfile }) {
  const { faq } = business;
  if (!faq.items.length) return null;

  return (
    <section
      id="faq"
      className="relative z-[1] bg-ivory py-[var(--lodge-section)]"
    >
      <div className="lodge-shell grid grid-cols-[0.85fr_1.15fr] items-start gap-[clamp(2.5rem,6vw,5.5rem)] max-[960px]:grid-cols-1">
        <div>
          <Eyebrow className="reveal">{faq.heading.label}</Eyebrow>
          <h2
            className="reveal mt-6 max-w-[14ch] font-lodge text-[clamp(2.1rem,4.3vw,3.9rem)] font-normal leading-[1.1] tracking-[-0.012em] text-bark [text-wrap:balance]"
            style={stagger(1)}
          >
            {faq.heading.title}
          </h2>
          {faq.heading.subtitle && (
            <p
              className="reveal mt-6 max-w-[38ch] font-light leading-[1.85] text-bark-soft"
              style={stagger(2)}
            >
              {faq.heading.subtitle}
            </p>
          )}
        </div>

        <div className="reveal" style={stagger(1)}>
          {faq.items.map((item) => (
            <details
              key={item.question}
              className="group border-t border-[var(--lodge-rule)] last:border-b"
            >
              <summary
                className={[
                  "flex cursor-pointer list-none items-start justify-between gap-6 py-[1.6rem]",
                  "font-lodge text-[clamp(1.15rem,1.7vw,1.5rem)] leading-[1.35] text-bark",
                  // Safari draws its own triangle on a summary and ignores
                  // `list-style`; this is the only thing that removes it.
                  "[&::-webkit-details-marker]:hidden",
                ].join(" ")}
              >
                {item.question}
                {/*
                 * A plus that becomes a minus. Two spans rather than a glyph
                 * so the state is drawn rather than typed — a character like
                 * "＋" renders differently on every platform, and at this size
                 * the difference is visible.
                 */}
                <span
                  aria-hidden="true"
                  className="relative mt-[0.55rem] block h-3 w-3 flex-none"
                >
                  <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-clay" />
                  <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-clay transition-transform duration-500 ease-[cubic-bezier(.22,.61,.36,1)] group-open:rotate-90" />
                </span>
              </summary>
              <p className="max-w-[58ch] pb-[1.8rem] pr-8 font-light leading-[1.85] text-bark-soft [text-wrap:pretty]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
