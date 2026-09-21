import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { BtnGold, BtnOutline } from "../components/buttons";
import { delay, reveal } from "../lib/reveal";

/**
 * The hero: copy on the left, a tall portrait on the right.
 *
 * The entrance is a staggered fade-up per group (eyebrow, headline, rule,
 * paragraph, buttons) with the photograph scaling in alongside — the mockup's
 * `data-animate`/`data-delay` pairs, carried across as `.reveal` classes and a
 * `--d` delay. Nothing here scroll-scrubs: the hero is a still composition,
 * and the only scroll-driven element is the cue at the bottom edge.
 */
export function Hero({ business }: { business: BusinessProfile }) {
  const { hero } = business;

  return (
    <section
      aria-label="Introduction"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      {/* Backdrop. Held at 20% under a cream wash: it is atmosphere, not
          content, which is why it carries no alt text. */}
      <div aria-hidden="true" className="absolute inset-0">
        {hero.image && (
          <div className="absolute inset-0 opacity-20">
            <TenantImage src={hero.image} alt="" sizes="100vw" priority />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream/95 to-gold-50/80" />
      </div>

      {/* Gold bloom. Decorative. */}
      <div
        aria-hidden="true"
        className="absolute right-10 top-20 h-72 w-72 rounded-full bg-gold-200/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-gold-100/30 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-32 lg:px-12 lg:py-0">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1">
            <p
              className={cn(
                reveal(),
                "mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-gold-500",
              )}
            >
              {hero.overline}
            </p>

            <h1
              className={cn(
                reveal(),
                "mb-8 font-serif text-5xl font-light leading-[0.95] sm:text-6xl lg:text-7xl xl:text-8xl",
              )}
              style={delay(100)}
            >
              {hero.titleLines.map((line, i) => (
                <Fragment key={`${i}-${line.text}`}>
                  {i > 0 && " "}
                  {/* `stroke` is the shared flag for "set this line apart".
                      The barber outlines it in gold; here it is the gold
                      semibold italic on its own line, which is this design's
                      own emphasis. */}
                  {line.stroke ? (
                    <span className="block font-semibold italic text-gold-500">
                      {line.text}
                    </span>
                  ) : (
                    line.text
                  )}
                </Fragment>
              ))}
            </h1>

            <div
              aria-hidden="true"
              className={cn(reveal(), "gold-divider-wide mb-8")}
              style={delay(200)}
            />

            <p
              className={cn(
                reveal(),
                "mb-10 max-w-lg text-lg font-light leading-relaxed text-charcoal/60 lg:text-xl",
              )}
              style={delay(300)}
            >
              {hero.description}
            </p>

            <div
              className={cn(reveal(), "flex flex-wrap gap-4")}
              style={delay(400)}
            >
              <BtnGold href={hero.primaryCta.href} className="px-10 py-4">
                {hero.primaryCta.label}
              </BtnGold>
              <BtnOutline href={hero.secondaryCta.href} className="px-10 py-4">
                {hero.secondaryCta.label}
              </BtnOutline>
            </div>
          </div>

          <div
            className={cn(reveal("scale"), "order-1 lg:order-2")}
            style={delay(200)}
          >
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-gold-200/40 to-gold-400/20 blur-2xl"
              />
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl">
                <TenantImage
                  src={hero.card?.image ?? hero.image}
                  alt={hero.imageAlt ?? ""}
                  sizes="(max-width: 1024px) 92vw, 45vw"
                  priority
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-charcoal/30 via-transparent to-transparent"
                />

                {/* The booking pill. Rendered only when the profile carries
                    one — an empty glass card reads as a loading state. */}
                {hero.badge && (
                  <div className="glass absolute bottom-8 left-8 rounded-2xl px-6 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white">
                      {hero.badge}
                    </p>
                    {hero.card?.title && (
                      <p className="mt-1 font-serif text-xl text-gold-300">
                        {hero.card.title}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div
                aria-hidden="true"
                className="deco-frame absolute -right-6 -top-6 h-32 w-32 rounded-3xl border border-gold-300/40"
              />
              <div
                aria-hidden="true"
                className="deco-frame absolute -bottom-6 -left-6 h-24 w-24 rounded-2xl border border-gold-300/30"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>
        </div>
      </div>

      <a
        href={business.nav[0]?.href ?? "#portfolio"}
        aria-label="Scroll to the next section"
        className={cn(
          reveal("in"),
          "animate-float absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2",
        )}
        style={delay(700)}
      >
        <span className="text-xs uppercase tracking-[0.2em] text-charcoal/40">
          Scroll
        </span>
        <span
          aria-hidden="true"
          className="block h-12 w-px bg-gradient-to-b from-gold-400 to-transparent"
        />
      </a>
    </section>
  );
}
