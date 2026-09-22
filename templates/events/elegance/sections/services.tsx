import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { cn } from "@/lib/utils";
import { ServiceIcon } from "../components/icons";
import { SectionHead, SplitTitle } from "../components/section-head";
import { delay, reveal } from "../lib/reveal";

/**
 * The dark band: what the studio does, then how it works.
 *
 * Two halves of one section in the mockup, and kept that way — the approach
 * panel is the evidence for the claims in the cards above it, and separating
 * them would leave a strip of four icons asserting competence with nothing
 * behind it.
 *
 * No prices. An event is quoted after a conversation, not listed per line
 * item, which is why the template doesn't declare `itemPricing` and the CMS
 * never asks an owner for a figure they would have to invent.
 */
export function Services({ business }: { business: BusinessProfile }) {
  const { services } = business;
  // On the services section now, not in the events namespace: an owner editing
  // "how we work" is editing this band of the page.
  /*
   * Every field of the panel is optional — clearing the eyebrow is how an
   * owner removes it — so the whole block is skipped unless there is a
   * photograph to hang it on, and each part is guarded below.
   */
  const approach = services.approach?.image ? services.approach : null;

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-charcoal py-28 lg:py-40"
    >
      {/* The dotted texture, at 5%. Decorative. */}
      <div aria-hidden="true" className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(201,169,60,0.3) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-gold-500/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <SectionHead heading={services.heading} onDark className="mb-20" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {services.items.map((service, i) => (
            <div
              key={service.title}
              className={cn(reveal(), "group text-center")}
              style={delay(100 * (i + 1))}
            >
              <div className="service-icon glass mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl group-hover:bg-gold-500/20">
                <ServiceIcon
                  name={service.icon}
                  className="h-8 w-8 text-gold-400 transition-all duration-300"
                />
              </div>
              <h3 className="mb-3 font-serif text-xl text-white">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        {approach && (
          <div className="mt-24 grid items-center gap-16 lg:grid-cols-2">
            <div className={cn(reveal("left"))}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <TenantImage
                  src={approach.image!}
                  alt={approach.imageAlt ?? ""}
                  sizes="(max-width: 1024px) 92vw, 45vw"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-charcoal/40 to-transparent"
                />
              </div>
            </div>

            <div className={cn(reveal("right"))}>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
                {approach.label}
              </p>
              <h3 className="mb-6 font-serif text-3xl font-light leading-snug text-white lg:text-4xl">
                <SplitTitle text={(approach.titleLines ?? []).join("\n")} onDark />
              </h3>
              <p className="mb-8 leading-relaxed text-white/50">
                {approach.text}
              </p>
              {(approach.stats?.length ?? 0) > 0 && (
                <dl className="flex flex-wrap gap-12">
                  {approach.stats!.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd>
                        <span className="stat-number block cursor-default font-serif text-4xl font-semibold text-gold-400">
                          {stat.value}
                        </span>
                        <span className="mt-1 block text-sm text-white/55">
                          {stat.label}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
