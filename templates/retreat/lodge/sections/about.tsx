import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { Frame } from "../components/frame";
import { Eyebrow, ItalicLastLine } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The brand story (mockup "INTRO / BRAND STORY").
 *
 * The copy sits opposite a tall photograph, and the checklist the barber
 * template renders as ticks is set here as a single line of small caps
 * separated by dots — the same `about.features` list, in the form this design
 * has room for.
 */
export function About({ business }: { business: BusinessProfile }) {
  const { about, retreat } = business;

  return (
    <section
      id="about"
      className="relative z-[1] bg-ivory py-[var(--lodge-section-lg)]"
    >
      <div className="lodge-shell grid grid-cols-[1.05fr_0.95fr] items-center gap-[clamp(2.5rem,6vw,6rem)] max-[960px]:grid-cols-1">
        <div className="max-w-[34rem]">
          <Eyebrow className="reveal">{about.label}</Eyebrow>

          <h2
            className="reveal mb-8 mt-6 font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-bark"
            style={stagger(1)}
          >
            <ItalicLastLine lines={about.titleLines} />
          </h2>

          <p
            className="reveal max-w-[46ch] text-[clamp(1.02rem,1.25vw,1.2rem)] font-light leading-[1.72] text-bark-soft"
            style={stagger(2)}
          >
            {about.text}
          </p>

          {about.paragraphs?.map((paragraph, i) => (
            <p
              key={paragraph}
              className="reveal mt-[1.15rem] max-w-[52ch] font-light text-bark-soft"
              style={stagger(3 + i)}
            >
              {paragraph}
            </p>
          ))}

          {about.features.length > 0 && (
            <p
              className="reveal mt-[2.8rem] flex flex-wrap items-center gap-4 border-t border-[var(--lodge-rule)] pt-[1.6rem] text-[0.68rem] uppercase tracking-[0.2em] text-sage"
              style={stagger(3)}
            >
              {about.features.map((feature, i) => (
                <Fragment key={feature}>
                  {i > 0 && (
                    <i
                      aria-hidden="true"
                      className="block h-[3px] w-[3px] rounded-full bg-clay"
                    />
                  )}
                  {feature}
                </Fragment>
              ))}
            </p>
          )}
        </div>

        <figure className="relative">
          <Frame
            src={about.image}
            alt={about.imageAlt ?? ""}
            sizes="(max-width: 960px) 92vw, 45vw"
            className="aspect-[4/5] max-[960px]:aspect-[5/4]"
          />
          {retreat?.introCaption && (
            <figcaption
              className="reveal mt-4 text-[0.68rem] uppercase tracking-[0.16em] text-sage"
              style={stagger(1)}
            >
              {retreat.introCaption}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
