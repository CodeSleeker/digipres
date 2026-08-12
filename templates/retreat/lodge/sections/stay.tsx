import type { BusinessProfile } from "@/types/business";
import { Frame } from "../components/frame";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * "The Stay" — this template's services section.
 *
 * The cards carry a number, a title and a sentence: no price, no glyph, no
 * photograph. A private house is booked as a whole rather than priced per line
 * item, which is why the template does not declare `itemPricing` and the CMS
 * never asks an owner for a figure they would have to invent.
 *
 * The numbering is derived from position rather than stored. It is a
 * presentation detail — an owner who reorders their cards should not have to
 * renumber them, and a stored number would be dropped by the first save.
 */
export function Stay({ business }: { business: BusinessProfile }) {
  const { services, retreat } = business;

  return (
    <section
      id="stay"
      className="relative z-[1] bg-ivory py-[var(--lodge-section)]"
    >
      <div className="lodge-shell">
        <div className="mb-[clamp(2.8rem,5vw,4.2rem)] grid grid-cols-2 items-end gap-[clamp(2rem,5vw,5rem)] max-[960px]:grid-cols-1 max-[960px]:items-start max-[960px]:gap-[1.6rem]">
          <div>
            <Eyebrow className="reveal">{services.heading.label}</Eyebrow>
            <h2
              className="reveal mt-6 max-w-[14ch] font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-bark [text-wrap:balance]"
              style={stagger(1)}
            >
              {services.heading.title}
            </h2>
          </div>
          {services.heading.subtitle && (
            <p
              className="reveal max-w-[46ch] text-[clamp(1.02rem,1.25vw,1.2rem)] font-light leading-[1.72] text-bark-soft"
              style={stagger(2)}
            >
              {services.heading.subtitle}
            </p>
          )}
        </div>

        {/* Clearing the photograph closes the gap between the heading and the
            cards, rather than leaving an empty sand-coloured band. */}
        {retreat?.stayImage.src && (
          <Frame
            src={retreat.stayImage.src}
            alt={retreat.stayImage.alt}
            sizes="(max-width: 960px) 92vw, 90vw"
            className="aspect-[21/9]"
          />
        )}

        <div className="mt-[clamp(3.5rem,6vw,5.5rem)] grid grid-cols-4 gap-[clamp(1.6rem,3vw,3rem)] max-[1100px]:grid-cols-2 max-[1100px]:gap-x-8 max-[1100px]:gap-y-[2.4rem] max-[720px]:grid-cols-1 max-[720px]:gap-0">
          {services.items.map((item, i) => (
            <article
              key={item.title}
              className="reveal border-t border-[var(--lodge-rule)] pt-6 max-[720px]:py-[1.6rem]"
              style={stagger(i)}
            >
              <span
                aria-hidden="true"
                className="mb-[1.4rem] block text-[0.66rem] tracking-[0.2em] text-clay max-[720px]:mb-[0.9rem]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-[0.7rem] font-lodge text-[clamp(1.4rem,2vw,1.85rem)] font-normal leading-[1.25] text-bark">
                {item.title}
              </h3>
              <p className="text-[0.925rem] font-light leading-[1.75] text-bark-soft">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
