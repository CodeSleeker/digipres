import type { BusinessProfile } from "@/types/business";
import { TenantImage } from "@/components/ui/tenant-image";
import { Btn } from "../components/buttons";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";
import { messengerLink } from "../lib/messenger";
import { EnquiryForm } from "./enquiry-form";

/** The closing invitation to book, and the enquiry that carries it. */
export function BookingCta({ business }: { business: BusinessProfile }) {
  const { ctaBanner, retreat } = business;
  // Derived from the tenant's own Facebook column (build-profile), never from
  // template content — so it is a real page or it is nothing.
  const messenger = messengerLink(
    business.footer.socials.find((s) => s.label === "FB")?.href,
  );

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

        {/*
         * The enquiry itself, where two dead buttons used to be.
         *
         * The approved mockup leaves both as `href="#"` with a TODO for the
         * booking link, so there was never a working destination to port. A
         * form here reaches the platform's own intake — the owner gets an SMS,
         * an email and a live dashboard entry — which no link to a third-party
         * site can do.
         */}
        <EnquiryForm business={business} />

        {/*
         * The other way to reach them, and the answer to "notify the owner on
         * Messenger": a visitor writing to the Page is what makes Facebook
         * notify the owner. See lib/messenger.ts for why the reverse isn't
         * possible. Rendered only when the owner has set a Facebook page —
         * `footer.socials` is derived from their own column, so an unset one
         * yields nothing rather than a dead link.
         */}
        {messenger && (
          <div
            className="reveal mt-[2.2rem] flex justify-center"
            style={stagger(4)}
          >
            <Btn
              href={messenger}
              variant="ghostLight"
              arrow
              target="_blank"
              rel="noopener noreferrer"
            >
              {ctaBanner.callCta.label}
            </Btn>
          </div>
        )}
      </div>
    </section>
  );
}
