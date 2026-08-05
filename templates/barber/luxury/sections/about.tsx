import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { ButtonLink } from "../components/buttons";
import { SectionLabel, SectionTitle } from "../components/section-heading";

export function About({ business }: { business: BusinessProfile }) {
  const { about } = business;

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-charcoal py-[var(--section-pad)]"
    >
      <div className="site-container">
        <div className="grid grid-cols-2 items-center gap-16 max-[1024px]:gap-10 max-[768px]:grid-cols-1 max-[768px]:gap-10">
          {/* Image */}
          <div className="reveal relative max-[768px]:max-w-full max-[768px]:overflow-hidden">
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              {/* Decorative by default — the adjacent copy carries the meaning,
                  so alt="" is correct and a screen reader skips it. An owner
                  whose photo shows something the words don't (the shop floor,
                  the owner at work) can describe it and promote it. */}
              <TenantImage
                src={about.image}
                alt={about.imageAlt ?? ""}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-center brightness-[0.85] contrast-[1.05]"
              />
            </div>
            <div className="pointer-events-none absolute -bottom-6 left-6 right-[-1.5rem] top-6 border border-gold opacity-30 max-[1024px]:-bottom-4 max-[1024px]:left-4 max-[1024px]:right-[-1rem] max-[1024px]:top-4 max-[768px]:hidden" />
            <div className="absolute -right-4 bottom-8 z-[2] animate-float bg-gold p-6 text-center text-black max-[1024px]:bottom-6 max-[1024px]:right-0 max-[768px]:relative max-[768px]:bottom-auto max-[768px]:right-auto max-[768px]:float-right max-[768px]:-mt-8 max-[768px]:ml-auto max-[768px]:mr-4 max-[768px]:inline-flex max-[768px]:flex-col max-[768px]:items-center max-[480px]:p-4">
              <h4 className="font-heading text-[2.5rem] leading-none max-[480px]:text-[2rem]">
                {about.badgeValue}
              </h4>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[3px]">
                {about.badgeLabel}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="py-4">
            <SectionLabel className="reveal">{about.label}</SectionLabel>
            <SectionTitle className="reveal reveal-delay-1 mb-6">
              {about.titleLines.map((line, i) => (
                <Fragment key={i}>
                  {line}
                  {i < about.titleLines.length - 1 && <br />}
                </Fragment>
              ))}
            </SectionTitle>
            <p className="reveal reveal-delay-2 mb-8 text-base font-light leading-[1.9] text-gray-light">
              {about.text}
            </p>
            <div className="reveal reveal-delay-3 mb-10 grid grid-cols-2 gap-5 max-[768px]:grid-cols-1 max-[768px]:gap-4">
              {about.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 text-[0.85rem] text-gray-light"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-gold/10 text-[0.7rem] text-gold">
                    ✓
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <ButtonLink
              href={about.cta.href}
              arrow={about.cta.arrow}
              className="reveal reveal-delay-4 max-[768px]:w-full max-[768px]:justify-center"
            >
              {about.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
