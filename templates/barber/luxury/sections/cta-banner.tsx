import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { ButtonLink } from "../components/buttons";
import { SectionLabel, SectionTitle } from "../components/section-heading";

export function CtaBanner({ business }: { business: BusinessProfile }) {
  const { ctaBanner } = business;

  return (
    <section className="relative overflow-hidden bg-black py-[var(--section-pad)]">
      <div className="site-container">
        <div className="reveal relative overflow-hidden border border-dark-border bg-[linear-gradient(135deg,var(--color-dark)_0%,var(--color-charcoal)_100%)] p-[clamp(3rem,6vw,6rem)] text-center max-[768px]:px-6 max-[768px]:py-10">
          <div className="absolute -top-[200px] left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.06)_0%,transparent_70%)]" />
          <div className="relative z-[1]">
            <SectionLabel centered>{ctaBanner.label}</SectionLabel>
            <SectionTitle className="mb-4">
              {ctaBanner.titleLines.map((line, i) => (
                <Fragment key={i}>
                  {line}
                  {i < ctaBanner.titleLines.length - 1 && <br />}
                </Fragment>
              ))}
            </SectionTitle>
            <p className="mx-auto mb-10 max-w-[550px] text-base font-light leading-[1.8] text-gray-light">
              {ctaBanner.description}
            </p>
            <div className="flex flex-wrap justify-center gap-4 max-[768px]:flex-col">
              <ButtonLink
                href={ctaBanner.primaryCta.href}
                arrow={ctaBanner.primaryCta.arrow}
                className="max-[768px]:w-full max-[768px]:justify-center"
              >
                {ctaBanner.primaryCta.label}
              </ButtonLink>
              <ButtonLink
                href={ctaBanner.callCta.href}
                variant="outline"
                className="max-[768px]:w-full max-[768px]:justify-center"
              >
                {ctaBanner.callCta.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
