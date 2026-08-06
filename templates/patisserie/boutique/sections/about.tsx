import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { Frame } from "../components/frame";
import { Eyebrow, SectionTitle } from "../components/section-head";
import { stagger } from "../lib/reveal";

export function About({ business }: { business: BusinessProfile }) {
  const { about } = business;

  return (
    <section id="about" className="relative py-[var(--pastry-section)]">
      <div className="pastry-shell grid grid-cols-[0.95fr_1.05fr] items-center gap-[clamp(2.5rem,1rem+5vw,5.5rem)] max-[900px]:grid-cols-1">
        <div className="reveal reveal-from-left relative max-[900px]:max-w-[480px]">
          <div className="group">
            <Frame
              src={about.image}
              alt={about.imageAlt ?? ""}
              sizes="(max-width: 900px) 92vw, 40vw"
              className="aspect-[4/4.6] rounded-[42px] shadow-[var(--pastry-sh-md)]"
            />
          </div>
          <div className="absolute -right-6 bottom-8 rounded-[22px] border border-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.85)] px-[1.35rem] py-[1.15rem] text-center shadow-[var(--pastry-sh-lg)] backdrop-blur-[16px] max-[900px]:right-4">
            <small className="mb-[0.35rem] block text-[0.66rem] uppercase tracking-[0.15em] text-ink-45">
              {about.badgeLabel}
            </small>
            <b className="block font-display text-[1.85rem] leading-none text-ink">
              {about.badgeValue}
            </b>
          </div>
        </div>

        <div>
          <Eyebrow className="reveal">{about.label}</Eyebrow>
          <SectionTitle className="reveal mt-4">
            {about.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {i === about.titleLines.length - 1 &&
                about.titleLines.length > 1 ? (
                  <span className="font-normal italic">{line}</span>
                ) : (
                  line
                )}
              </Fragment>
            ))}
          </SectionTitle>

          <div className="reveal mt-[1.4rem]" style={stagger(2)}>
            <p className="text-[clamp(1.02rem,0.97rem+0.3vw,1.185rem)] leading-[1.68] text-ink-70 [text-wrap:pretty]">
              {about.text}
            </p>
            {about.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-[1.1rem] [text-wrap:pretty]">
                {paragraph}
              </p>
            ))}
          </div>

          {/* `about.features` — the barber template's checklist — is
              deliberately NOT rendered. The approved design carries figures
              here instead, and the CMS never offers the field to this template
              (templates/registry → `fields.aboutFeatures`), so rendering it
              would be markup no owner could ever produce. */}

          {about.stats && about.stats.length > 0 && (
            <dl
              className="reveal mt-10 grid grid-cols-3 gap-5 border-t border-[var(--pastry-line)] pt-9 max-[520px]:grid-cols-1 max-[520px]:gap-6"
              style={stagger(3)}
            >
              {about.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="m-0">
                    <b className="block font-display text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] leading-none text-ink">
                      {stat.value}
                    </b>
                    <span className="mt-2 block text-[0.75rem] leading-[1.45] text-ink-45">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {about.signature && (
            <div
              className="reveal mt-9 flex flex-wrap items-center gap-4"
              style={stagger(4)}
            >
              <span className="font-display text-[1.75rem] italic text-ink">
                {about.signature.name}
              </span>
              <small className="text-[0.75rem] text-ink-45">
                {about.signature.role}
              </small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
