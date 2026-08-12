import type { BusinessProfile } from "@/types/business";
import { Frame } from "../components/frame";
import { Btn } from "../components/buttons";
import { Eyebrow, ItalicLastLine } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * Where the property is — this template's contact section.
 *
 * The copy is editable (`contact`); the photograph, the map panel and the
 * directions link are template content, because the map is a placeholder until
 * an embed is wired up and a link to it is not something to invent on a
 * tenant's behalf.
 */
export function Location({ business }: { business: BusinessProfile }) {
  const { contact, retreat } = business;
  const place = retreat?.location;

  return (
    <section
      id="location"
      className="relative z-[1] bg-ivory py-[var(--lodge-section-lg)]"
    >
      <div className="lodge-shell grid grid-cols-[1fr_1.15fr] items-center gap-[clamp(2.5rem,6vw,5.5rem)] max-[960px]:grid-cols-1">
        <div>
          <Eyebrow className="reveal">{contact.label}</Eyebrow>
          <h2
            className="reveal mt-6 font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-bark"
            style={stagger(1)}
          >
            <ItalicLastLine lines={contact.titleLines} />
          </h2>

          <p
            className="reveal mt-8 max-w-[46ch] text-[clamp(1.02rem,1.25vw,1.2rem)] font-light leading-[1.72] text-bark-soft"
            style={stagger(2)}
          >
            {contact.intro}
          </p>

          {/*
           * The address, hours and phone, as the platform derives them from the
           * tenant's own columns. Rendered as a description list rather than the
           * mockup's second paragraph: this is structured information, and a
           * screen reader should be able to move through it as such.
           */}
          {contact.details.length > 0 && (
            <dl
              className="reveal mt-9 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--lodge-rule)] pt-8 max-[520px]:grid-cols-1"
              style={stagger(2)}
            >
              {contact.details.map((detail) => (
                <div key={detail.title}>
                  <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-sage">
                    {detail.title}
                  </dt>
                  <dd className="mt-2 text-[0.9rem] font-light leading-[1.9] text-bark-soft">
                    {detail.lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/*
           * Rendered only for a real destination.
           *
           * The template default carries a map search for the seeded address;
           * a tenant whose link has not been set gets no button rather than one
           * that goes nowhere — the same rule the footer's social icons follow.
           */}
          {place?.mapCta.href && place.mapCta.href !== "#" && (
            <div
              className="reveal mt-[2.6rem] flex flex-wrap gap-4 max-[520px]:[&>a]:flex-[1_1_100%] max-[520px]:[&>a]:justify-center"
              style={stagger(3)}
            >
              <Btn
                href={place.mapCta.href}
                variant="solid"
                arrow={place.mapCta.arrow}
                target="_blank"
                rel="noopener noreferrer"
              >
                {place.mapCta.label}
              </Btn>
            </div>
          )}
        </div>

        {place && (
          <div className="grid gap-[clamp(0.8rem,1.5vw,1.2rem)]">
            <Frame
              src={place.image}
              alt={place.imageAlt}
              sizes="(max-width: 960px) 92vw, 50vw"
              className="aspect-[16/10]"
            />

            {/* Placeholder for the map embed. Announced as an image with its
                own label, so it is never read out as an empty panel. */}
            <div
              role="img"
              aria-label={place.mapLabel}
              className="reveal grid aspect-[16/6] place-items-center rounded-[2px] border border-[var(--lodge-rule)] bg-[repeating-linear-gradient(45deg,rgba(121,130,115,0.07)_0_2px,transparent_2px_11px),var(--color-ivory-alt)] p-6 text-center"
              style={stagger(1)}
            >
              <div>
                <span
                  aria-hidden="true"
                  className="mx-auto mb-[0.9rem] block h-[9px] w-[9px] rounded-full bg-clay shadow-[0_0_0_7px_rgba(138,104,75,0.14),0_0_0_15px_rgba(138,104,75,0.07)]"
                />
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-sage">
                  {place.mapLabel}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
