import type { AccentTone, BusinessProfile, Service } from "@/types/business";
import { cn } from "@/lib/utils";
import { Frame } from "../components/frame";
import { HeadRow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The current menu.
 *
 * Renders the shared `services` section — the same slot the barber template
 * fills with grooming services. A menu item is a service with a photograph, so
 * the shape is reused rather than duplicated.
 */
export function Featured({ business }: { business: BusinessProfile }) {
  const { services } = business;
  if (!services.items.length) return null;

  return (
    <section id="featured" className="relative py-[var(--pastry-section)]">
      <div className="pastry-shell">
        <HeadRow heading={services.heading} />

        <div className="mt-[clamp(2.75rem,2rem+2vw,4rem)] grid grid-cols-3 gap-7 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-[1.35rem]">
          {services.items.map((item, i) => (
            <DishCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The chip tint.
 *
 * Derived from position rather than stored: the CMS forms have no input for it,
 * so a stored tone would be dropped the first time an owner saved the section —
 * and a card would silently lose its colour with nothing to explain why.
 */
const TONES: AccentTone[] = ["mint", "warm", "pink"];

const CHIP_TINT: Record<AccentTone, string> = {
  mint: "bg-mint-wash before:bg-mint",
  warm: "bg-warm-wash before:bg-warm",
  pink: "bg-pink-wash before:bg-pink",
};

function DishCard({ item, index }: { item: Service; index: number }) {
  return (
    <article
      className={cn(
        "group reveal flex flex-col overflow-hidden rounded-[30px] border border-[var(--pastry-line-soft)] bg-snow shadow-[var(--pastry-sh-sm)]",
        "transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2 hover:shadow-[var(--pastry-sh-lg)]",
        // Editorial offset: the middle card is lifted on wide screens. Uses the
        // independent `translate` property so it composes with the reveal and
        // hover `transform` rather than overriding them.
        index === 1 && "min-[981px]:[translate:0_-34px]",
      )}
      style={stagger(index)}
    >
      <Frame
        src={item.image}
        alt={item.imageAlt ?? ""}
        sizes="(max-width: 640px) 92vw, (max-width: 980px) 46vw, 30vw"
        className="aspect-[4/3.35] rounded-none"
      />
      <div className="flex flex-1 flex-col px-[1.6rem] pb-7 pt-[1.6rem]">
        {item.tag && (
          <span
            className={cn(
              "mb-4 inline-flex items-center gap-[0.45rem] self-start rounded-full px-[0.85rem] py-[0.42rem] text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink",
              // A single saturated dot ties the tinted pill back to the full
              // palette; ink on the wash clears 12:1, which coloured type never
              // would.
              "before:h-1.5 before:w-1.5 before:flex-none before:rounded-full before:content-['']",
              CHIP_TINT[TONES[index % TONES.length]!],
            )}
          >
            {item.tag}
          </span>
        )}
        <h3 className="font-display text-[clamp(1.3rem,1.15rem+0.6vw,1.6rem)] font-medium leading-[1.1] tracking-[-0.012em] text-ink">
          {item.title}
        </h3>
        <p className="mt-[0.65rem] text-[0.9rem] text-ink-70">
          {item.description}
        </p>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--pastry-line-soft)] pt-[1.35rem]">
          <span className="font-display text-[1.3rem] text-ink">
            {item.price}{" "}
            {item.unit && (
              <small className="font-pastry text-[0.72rem] font-medium text-ink-45">
                {item.unit}
              </small>
            )}
          </span>
          {item.meta && (
            <span className="text-[0.75rem] text-ink-45">{item.meta}</span>
          )}
        </div>
      </div>
    </article>
  );
}
