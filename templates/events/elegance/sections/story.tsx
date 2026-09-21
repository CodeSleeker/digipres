import { Award } from "lucide-react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { SplitTitle } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * The founder's story: copy on the left, a portrait with a floating award card
 * on the right.
 *
 * The one section with an asymmetric grid (3/2 rather than half and half) —
 * the text carries the weight here and the photograph is support, which is the
 * reverse of the hero.
 */
export function Story({ business }: { business: BusinessProfile }) {
  const { about } = business;

  return (
    <section id="story" className="relative overflow-hidden py-28 lg:py-40">
      <div
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-gold-100/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-5">
          <div className={cn(reveal(), "lg:col-span-3")}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold-500">
              {about.label}
            </p>
            <h2 className="mb-8 font-serif text-4xl font-light leading-tight sm:text-5xl lg:text-6xl">
              <SplitTitle text={about.titleLines.join("\n")} />
            </h2>
            <div aria-hidden="true" className="gold-divider mb-8" />

            <p className="mb-6 text-lg leading-relaxed text-charcoal/60">
              {about.text}
            </p>
            {about.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mb-6 leading-relaxed text-charcoal/60"
              >
                {paragraph}
              </p>
            ))}

            {about.signature && (
              <div className="mt-10 flex items-center gap-6">
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 font-serif text-2xl font-bold text-gold-600"
                >
                  {business.brand.initial}
                </span>
                <div>
                  <p className="font-semibold text-charcoal">
                    {about.signature.name}
                  </p>
                  <p className="text-sm text-charcoal/50">
                    {about.signature.role}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(reveal("scale"), "lg:col-span-2")}
            style={delay(200)}
          >
            <div className="relative">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-xl">
                <TenantImage
                  src={about.image}
                  alt={about.imageAlt ?? ""}
                  sizes="(max-width: 1024px) 92vw, 35vw"
                />
              </div>

              {/* The award card. Rendered only when the profile carries both
                  halves — a badge reading "undefined" is worse than none. */}
              {about.badgeValue && about.badgeLabel && (
                <div className="absolute -bottom-8 -left-8 rounded-2xl border border-gold-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100"
                    >
                      <Award className="h-5 w-5 text-gold-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {about.badgeValue}
                      </p>
                      <p className="text-xs text-charcoal/50">
                        {about.badgeLabel}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
