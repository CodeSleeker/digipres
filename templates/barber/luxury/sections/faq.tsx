import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../components/section-heading";
import { revealDelay } from "../lib/reveal";

/**
 * FAQ accordion.
 *
 * Built on native <details>/<summary> rather than a JS disclosure, for three
 * reasons that all point the same way:
 *
 *  1. The answers stay in the DOM while collapsed. That is the whole point of
 *     the section — a crawler or answer engine has to be able to read text the
 *     visitor hasn't clicked yet. A JS accordion that mounts panels on open
 *     would hide precisely the content we are trying to publish.
 *  2. It stays a server component. No hydration cost for a section that is
 *     nothing but text.
 *  3. Toggle-on-Enter/Space, focus order and the expanded/collapsed state
 *     announced to screen readers all come from the browser, correct by
 *     construction rather than by our own aria bookkeeping.
 *
 * Renders NOTHING when the tenant has no questions. The template default ships
 * with zero items, so an un-customized site shows no empty strip — and
 * buildFaqJsonLd is gated on the same list, keeping the markup and the visible
 * page in agreement as Google's structured-data policy requires.
 */
export function Faq({ business }: { business: BusinessProfile }) {
  const { faq } = business;
  if (!faq.items.length) return null;

  return (
    <section id="faq" className="relative bg-black py-[var(--section-pad)]">
      <div className="site-container">
        <SectionHeading {...faq.heading} />
        <div className="mx-auto max-w-[820px]">
          {faq.items.map((item, i) => (
            <details
              key={item.question}
              className={cn(
                "group border-b border-dark-border",
                i === 0 && "border-t",
                "reveal",
                revealDelay(i),
              )}
            >
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-6 py-6",
                  "transition-colors hover:text-gold",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  // Safari draws its own disclosure triangle from a pseudo
                  // element that `list-none` alone doesn't remove.
                  "[&::-webkit-details-marker]:hidden",
                )}
              >
                <h3 className="font-heading text-[1.05rem] tracking-[2px] text-white transition-colors group-open:text-gold max-[480px]:text-[0.95rem]">
                  {item.question}
                </h3>
                {/* Decorative: the open/closed state is already conveyed by the
                    element itself, so announcing a "+" would only duplicate it. */}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-2xl font-light leading-none text-gold transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              {/* whitespace-pre-line so an owner's paragraph breaks survive. */}
              <p className="whitespace-pre-line pb-6 pr-10 text-base font-light leading-[1.8] text-gray-light max-[480px]:pr-0">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
