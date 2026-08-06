import { Fragment } from "react";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";
import { Frame } from "../components/frame";
import { Btn } from "../components/buttons";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

export function Hero({ business }: { business: BusinessProfile }) {
  const { hero, marquee } = business;

  return (
    <section
      className="relative overflow-hidden pb-[clamp(3.5rem,2rem+6vw,6.5rem)] pt-[calc(var(--pastry-nav-h)+clamp(2.5rem,1rem+6vw,5.5rem))]"
      aria-labelledby="hero-title"
    >
      {/* Ambient colour fields. Kept faint on purpose: these are the only large
          areas of colour on the page and should read as warmth in the paper,
          not as a gradient. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[120px] -top-[140px] z-0 h-[520px] w-[520px] rounded-full bg-warm opacity-[0.16] blur-[70px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[180px] -left-[140px] z-0 h-[420px] w-[420px] rounded-full bg-mint opacity-[0.14] blur-[70px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[42%] top-[38%] z-0 h-[300px] w-[300px] rounded-full bg-pink opacity-[0.1] blur-[70px]"
      />

      <div className="pastry-shell relative z-[1] grid grid-cols-[1.02fr_0.98fr] items-center gap-[clamp(2.5rem,1rem+5vw,5rem)] max-[900px]:grid-cols-1">
        <div>
          <Eyebrow dot className="reveal" style={stagger(0)}>
            {hero.overline}
          </Eyebrow>

          <h1
            id="hero-title"
            className="reveal mt-[1.4rem] font-display text-[clamp(2.6rem,1.5rem+4.6vw,4.9rem)] font-medium leading-[1.02] tracking-[-0.028em] text-ink [text-wrap:balance]"
            style={stagger(1)}
          >
            {hero.titleLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {/* `stroke` is the shared flag for "set this line apart". The
                    barber template outlines it in gold; here it is the Playfair
                    italic, which is this design's own emphasis. */}
                {line.stroke ? (
                  <span className="font-normal italic">{line.text}</span>
                ) : (
                  line.text
                )}
              </Fragment>
            ))}
          </h1>

          <p
            className="reveal mt-[1.6rem] max-w-[33rem] text-[clamp(1.02rem,0.97rem+0.3vw,1.185rem)] leading-[1.68] text-ink-70 [text-wrap:pretty]"
            style={stagger(2)}
          >
            {hero.description}
          </p>

          <div
            className="reveal mt-[2.3rem] flex flex-wrap gap-[0.85rem]"
            style={stagger(3)}
          >
            <Btn href={hero.primaryCta.href} arrow={hero.primaryCta.arrow}>
              {hero.primaryCta.label}
            </Btn>
            <Btn
              href={hero.secondaryCta.href}
              variant="ghost"
              arrow={hero.secondaryCta.arrow}
            >
              {hero.secondaryCta.label}
            </Btn>
          </div>

          {hero.proof && (
            <div
              className="reveal mt-[2.6rem] flex max-w-[33rem] flex-wrap items-center gap-[1.05rem] border-t border-[var(--pastry-line)] pt-8"
              style={stagger(4)}
            >
              {/* Faces, not evidence: the sentence beside them carries the
                  claim, so the row is hidden from assistive tech entirely. */}
              <div aria-hidden="true" className="flex">
                {hero.proof.avatars.map((avatar, i) => (
                  <span
                    key={avatar}
                    className={cn(
                      "relative block h-[38px] w-[38px] overflow-hidden rounded-full border-2 border-paper shadow-[0_4px_10px_-6px_rgba(47,42,38,0.6)]",
                      i > 0 && "-ml-[11px]",
                    )}
                  >
                    <TenantImage src={avatar} alt="" sizes="38px" />
                  </span>
                ))}
              </div>
              <div>
                <div
                  aria-hidden="true"
                  className="text-[0.8rem] tracking-[0.12em] text-warm-deep"
                >
                  {"★".repeat(Math.max(0, Math.min(5, hero.proof.rating)))}
                </div>
                <p className="mt-[0.15rem] text-[0.875rem] leading-[1.6] text-ink-45">
                  <b className="text-ink">{hero.proof.highlight}</b>{" "}
                  {hero.proof.text}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Order flipped under 900px so the photograph leads on a phone. */}
        <div className="reveal reveal-scale relative max-[900px]:order-first max-[900px]:max-w-[520px]">
          <div className="group">
            <Frame
              src={hero.image}
              alt={hero.imageAlt ?? ""}
              priority
              sizes="(max-width: 900px) 92vw, 45vw"
              className="aspect-[4/5] rounded-[42px] shadow-[var(--pastry-sh-lg)] max-[900px]:aspect-[5/4] max-[900px]:rounded-[30px]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(200deg,rgba(47,42,38,0)_45%,rgba(47,42,38,0.34)_100%)]"
              />
            </Frame>
          </div>

          {hero.badge && (
            <div className="absolute -left-6 top-6 z-[2] flex items-center gap-[0.6rem] rounded-full border border-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.88)] py-[0.7rem] pl-[0.8rem] pr-[1.1rem] text-[0.78rem] font-semibold text-ink shadow-[var(--pastry-sh-md)] backdrop-blur-[14px] max-[900px]:left-4">
              <span
                aria-hidden="true"
                className="h-2 w-2 flex-none animate-pastry-pulse rounded-full bg-mint-deep shadow-[0_0_0_0_rgba(35,124,108,0.45)]"
              />
              {hero.badge}
            </div>
          )}

          {hero.card && <AvailabilityCard card={hero.card} />}
        </div>
      </div>

      {marquee.length > 0 && (
        <ul className="pastry-shell reveal relative z-[1] mt-[clamp(3rem,2rem+3vw,4.5rem)] flex list-none flex-wrap items-center gap-x-11 gap-y-4 border-t border-[var(--pastry-line)] pt-8">
          {marquee.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-[0.6rem] text-[0.78rem] font-semibold uppercase tracking-[0.13em] text-ink-45 before:h-[5px] before:w-[5px] before:rounded-full before:bg-warm before:content-['']"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The floating availability card.
 *
 * `progress` is clamped rather than trusted: it reaches this component from
 * tenant content, and a value outside 0–100 would paint the fill outside its
 * track.
 */
function AvailabilityCard({
  card,
}: {
  card: NonNullable<BusinessProfile["hero"]["card"]>;
}) {
  const percent = Math.max(0, Math.min(100, card.progress));

  return (
    <aside
      aria-label={card.title}
      className="absolute -right-7 bottom-9 z-[2] w-[min(268px,74%)] rounded-[22px] border border-[rgba(255,255,255,0.92)] bg-[rgba(255,255,255,0.9)] px-[1.2rem] py-[1.1rem] shadow-[var(--pastry-sh-lg)] backdrop-blur-[18px] backdrop-saturate-[160%] max-[900px]:right-4 max-[520px]:static max-[520px]:mt-4 max-[520px]:w-full"
    >
      <div className="flex items-center gap-[0.8rem]">
        <Frame
          src={card.image}
          alt=""
          zoom={false}
          sizes="46px"
          className="h-[46px] w-[46px] flex-none rounded-xl"
        />
        <div>
          <b className="block text-[0.875rem] font-semibold leading-[1.35] text-ink">
            {card.title}
          </b>
          <small className="text-[0.72rem] text-ink-45">{card.subtitle}</small>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mt-[0.95rem] h-1 overflow-hidden rounded-full bg-beige-deep"
      >
        <span
          className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-mint),var(--color-pink))]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <small className="mt-2 block text-[0.72rem] text-ink-45">
        {card.note}
      </small>
    </aside>
  );
}
