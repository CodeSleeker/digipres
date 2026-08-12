import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { Btn } from "../components/buttons";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/** The closing invitation to book. */
export function BookingCta({ business }: { business: BusinessProfile }) {
  const { ctaBanner, retreat } = business;

  return (
    <section
      id="book"
      className="lodge-on-dark relative z-[1] isolate overflow-hidden bg-bark py-[clamp(6rem,13vw,11rem)] text-center"
    >
      {retreat?.bookingImage && (
        <div aria-hidden="true" className="absolute inset-0 -z-20">
          <TenantImage
            src={retreat.bookingImage}
            alt=""
            sizes="100vw"
            className="opacity-40"
          />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(32,33,30,0.78),rgba(32,33,30,0.9))]"
      />

      <div className="lodge-shell">
        <Eyebrow
          plain
          className="reveal justify-center text-[rgba(245,241,232,0.82)]"
        >
          {ctaBanner.label}
        </Eyebrow>

        <h2
          className="reveal mx-auto mt-6 max-w-[15ch] font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-ivory"
          style={stagger(1)}
        >
          {ctaBanner.titleLines.join(" ")}
        </h2>

        <p
          className="reveal mx-auto mt-[1.8rem] max-w-[40ch] text-[clamp(1.02rem,1.25vw,1.2rem)] font-light text-[rgba(245,241,232,0.86)]"
          style={stagger(2)}
        >
          {ctaBanner.description}
        </p>

        <div
          className="reveal mt-[2.8rem] flex flex-wrap justify-center gap-4 max-[520px]:[&>a]:flex-[1_1_100%] max-[520px]:[&>a]:justify-center"
          style={stagger(3)}
        >
          <Btn
            href={ctaBanner.primaryCta.href}
            variant="light"
            arrow={ctaBanner.primaryCta.arrow}
          >
            {ctaBanner.primaryCta.label}
          </Btn>
          <Btn
            href={ctaBanner.callCta.href}
            variant="ghostLight"
            arrow={ctaBanner.callCta.arrow}
          >
            {ctaBanner.callCta.label}
          </Btn>
        </div>
      </div>
    </section>
  );
}
