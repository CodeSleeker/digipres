import type { BusinessProfile } from "@/types/business";
import { contactLine } from "@/lib/website/contact-line";
import { directionsUrl, osmEmbedUrl } from "@/lib/geo/coordinates";
import { SOCIALS_DETAIL_TITLE } from "@/lib/website/build-profile";
import { Frame } from "../components/frame";
import { Btn } from "../components/buttons";
import { Eyebrow, ItalicLastLine } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The underline is drawn from a background gradient rather than
 * `text-decoration`, so it can sit off the baseline at the weight the rest of
 * the design uses for rules.
 */
const LINK_CLASS =
  "bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-px text-bark transition-[background-size,color] duration-500 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-[length:0%_1px] hover:text-clay";

/**
 * One derived detail line, made actionable when it is a number or an address.
 *
 * The classification is shared (lib/website/contact-line.ts) because it is a
 * fact about the string; the markup is this template's own.
 */
function DetailLine({ line }: { line: string }) {
  const { href } = contactLine(line);

  if (!href) return <span className="block">{line}</span>;
  return (
    <span className="block">
      <a href={href} className={LINK_CLASS}>
        {line}
      </a>
    </span>
  );
}

/**
 * Where the property is — this template's contact section.
 *
 * The copy is editable (`contact`); the photograph, the map panel and the
 * directions link are template content, because the map is a placeholder until
 * an embed is wired up and a link to it is not something to invent on a
 * tenant's behalf.
 */
export function Location({ business }: { business: BusinessProfile }) {
  const { contact, retreat, footer } = business;
  const place = retreat?.location;

  /*
   * The socials card is dropped from the list and rendered as real links
   * instead.
   *
   * `buildContactDetails` summarises the platforms as one text line
   * ("Facebook · Instagram") — right for a design with a grid of small cards,
   * useless here, where it reads as a list of things you cannot click. The same
   * columns already reach the profile as `footer.socials`, complete with hrefs
   * and accessible names, so the links are drawn from those.
   */
  const details = contact.details.filter(
    (detail) => detail.title !== SOCIALS_DETAIL_TITLE,
  );

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
          {(details.length > 0 || footer.socials.length > 0) && (
            <dl
              className="reveal mt-9 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--lodge-rule)] pt-8 max-[520px]:grid-cols-1"
              style={stagger(2)}
            >
              {details.map((detail) => (
                <div key={detail.title}>
                  <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-sage">
                    {detail.title}
                  </dt>
                  <dd className="mt-2 text-[0.9rem] font-light leading-[1.9] text-bark-soft">
                    {detail.lines.map((line) => (
                      <DetailLine key={line} line={line} />
                    ))}
                  </dd>
                </div>
              ))}

              {footer.socials.length > 0 && (
                <div>
                  <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-sage">
                    Follow
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem] font-light leading-[1.9] text-bark-soft">
                    {footer.socials.map((social) => (
                      <a
                        key={social.href}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={LINK_CLASS}
                      >
                        {social.ariaLabel}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/*
           * Rendered only for a real destination.
           *
           * The template default carries a map search for the seeded address;
           * a tenant whose link has not been set gets no button rather than one
           * that goes nowhere — the same rule the footer's social icons follow.
           */}
          {/*
           * Directions, preferring the tenant's own pin.
           *
           * With a pin this opens turn-by-turn navigation from wherever the
           * visitor is — which is what someone tapping this in a car wants,
           * and something a template default can never provide. Without one it
           * falls back to the map link in the template content, and renders
           * nothing at all if that is a placeholder.
           */}
          {(contact.geo ||
            (place?.mapCta.href && place.mapCta.href !== "#")) && (
            <div
              className="reveal mt-[2.6rem] flex flex-wrap gap-4 max-[520px]:[&>a]:flex-[1_1_100%] max-[520px]:[&>a]:justify-center"
              style={stagger(3)}
            >
              <Btn
                href={
                  contact.geo ? directionsUrl(contact.geo) : place!.mapCta.href
                }
                variant="solid"
                arrow
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact.geo ? "Get Directions" : place!.mapCta.label}
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

            {/*
             * The real map once the owner has set a pin, and the placeholder
             * until then.
             *
             * OpenStreetMap rather than Google: the Google Embed API needs an
             * API key and a billing account per deployment, which would make a
             * map a paid feature. `loading="lazy"` because it is a third-party
             * frame well below the fold — it should cost nothing until someone
             * scrolls to it.
             */}
            {contact.geo ? (
              <iframe
                title={`Map showing ${place.mapLabel}`}
                src={osmEmbedUrl(contact.geo)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="reveal aspect-[16/6] w-full rounded-[2px] border border-[var(--lodge-rule)]"
                style={stagger(1)}
              />
            ) : (
              /* Announced as an image with its own label, so it is never read
                 out as an empty panel. */
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
            )}
          </div>
        )}
      </div>
    </section>
  );
}
