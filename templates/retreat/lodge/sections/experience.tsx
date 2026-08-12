import type { BusinessProfile } from "@/types/business";
import { Eyebrow, ItalicLastLine } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The dark strip: three numbered notes on what a stay is actually like.
 *
 * Template copy rather than an editable section (`RetreatSections.experience`).
 * It is the one part of the page that describes a feeling rather than the
 * property, and there is no shared section shape it belongs to — a retreat's
 * "experience" is not a service, a product or a testimonial.
 */
export function Experience({ business }: { business: BusinessProfile }) {
  const content = business.retreat?.experience;
  // The notes are the section; a heading with nothing under it is not one.
  // Removing every note is how an owner takes the whole band off their page.
  if (!content?.items.length) return null;

  return (
    <section
      id="experience"
      className="lodge-on-dark relative z-[1] bg-bark py-[var(--lodge-section-lg)] text-ivory"
    >
      <div className="lodge-shell">
        <div className="mb-[clamp(3rem,6vw,5rem)] max-w-[60rem]">
          <Eyebrow className="reveal text-sand">{content.label}</Eyebrow>
          <h2
            className="reveal mt-6 font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em]"
            style={stagger(1)}
          >
            <ItalicLastLine lines={content.titleLines} />
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[clamp(2rem,5vw,4.5rem)] max-[960px]:grid-cols-1 max-[960px]:gap-0">
          {content.items.map((item, i) => (
            <article
              key={item.title}
              className="reveal border-t border-[var(--lodge-rule-invert)] pt-[1.8rem] max-[960px]:py-8"
              style={stagger(i)}
            >
              <span
                aria-hidden="true"
                className="mb-[1.6rem] block font-lodge text-[1.35rem] text-sand opacity-[0.72] max-[960px]:mb-4"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-[0.9rem] font-lodge text-[clamp(1.4rem,2vw,1.85rem)] font-normal leading-[1.25]">
                {item.title}
              </h3>
              <p className="text-[0.94rem] font-light leading-[1.8] text-[rgba(245,241,232,0.62)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
