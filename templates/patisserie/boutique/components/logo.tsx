import Image from "next/image";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The brand lockup: a mark, and the business name beside it.
 *
 * Four states, all reachable without a setting (matching the barber template's
 * Logo, for the same reasons):
 *
 *   logo only        uploaded mark + name as text     (the common case)
 *   wordmark only    one image, no text               (a single lockup)
 *   both             uploaded mark + uploaded wordmark
 *   neither          ink initial tile + name as text
 *
 * ACCESSIBILITY. The name reaches the accessible tree exactly once. As text,
 * the mark image is decorative (`alt=""`); as an image, that image carries the
 * name. `aria-label` on the anchor names the link itself, which is otherwise
 * announced as whatever the images happen to leave behind.
 *
 * On the light header the wordmark uses the DEEP hues: the logo's own mint and
 * pink measure about 2:1 on paper, against 5.0–5.2:1 for these. The footer
 * passes `onDark` and gets the full-strength colours, which the ink ground
 * carries.
 */
export function Logo({
  business,
  className,
  onDark,
  href = "#top",
}: {
  business: BusinessProfile;
  className?: string;
  onDark?: boolean;
  href?: string;
}) {
  const { logoUrl, wordmarkUrl, initial, namePrimary, nameAccent } =
    business.brand;
  const name = [namePrimary, nameAccent].filter(Boolean).join(" ");
  // "Desserts by Arah" → "Desserts" / "by" / "Arah": the middle word is set
  // apart when the name has one, exactly as the mockup's lockup does.
  const words = namePrimary.trim().split(/\s+/).filter(Boolean);
  const lead = words.slice(0, -1).join(" ");
  const joiner = words.length > 1 ? words[words.length - 1] : "";

  const content = (
    <>
      {logoUrl ? (
        <LogoImage src={logoUrl} />
      ) : (
        // A wordmark image already contains its own mark; a tile beside it
        // reads as two competing logos.
        !wordmarkUrl && (
          <span
            aria-hidden="true"
            className={cn(
              "relative grid h-[38px] w-[38px] flex-none place-content-center rounded-xl font-display text-[1.15rem] leading-none shadow-[0_6px_16px_-8px_rgba(47,42,38,0.7)]",
              onDark ? "bg-paper text-ink shadow-none" : "bg-ink text-paper",
              "after:absolute after:-bottom-[3px] after:-right-[3px] after:h-[11px] after:w-[11px] after:rounded-full after:bg-pink after:content-['']",
              onDark ? "after:border-2 after:border-ink" : "after:border-2 after:border-paper",
            )}
          >
            {initial}
          </span>
        )
      )}

      {wordmarkUrl ? (
        <WordmarkImage src={wordmarkUrl} alt={name} />
      ) : (
        <span className="flex flex-col leading-[1.05]">
          <b
            className={cn(
              "font-display text-[1.075rem] font-medium tracking-[-0.01em]",
              onDark && "text-[1.2rem] text-paper",
            )}
          >
            <span className={onDark ? "text-mint" : "text-mint-deep"}>
              {lead || namePrimary}
            </span>
            {joiner && lead && (
              <>
                {" "}
                <span
                  className={cn(
                    "italic",
                    onDark ? "text-[rgba(255,253,248,0.55)]" : "text-ink-45",
                  )}
                >
                  {joiner}
                </span>
              </>
            )}
            {nameAccent && (
              <>
                {" "}
                <span className={onDark ? "text-pink" : "text-pink-deep"}>
                  {nameAccent}
                </span>
              </>
            )}
          </b>
          {/* The mockup sets a small strapline under the name. It is deliberately
              NOT rendered: the brand contract carries a name and a mark, and
              nothing else the tenant has written belongs at 9px in a lockup.
              Restoring it means adding a `tagline` to `brand`, not borrowing a
              line that was written for somewhere else. */}
        </span>
      )}
    </>
  );

  return (
    <a
      href={href}
      aria-label={`${name}, home`}
      className={cn("flex items-center gap-[0.7rem]", className)}
    >
      {content}
    </a>
  );
}

const LOGO_CLASS =
  "h-[38px] w-auto max-w-36 object-contain object-left rounded-xl";

/** `object-contain`: a logo cropped to fill a square stops being the logo. */
function LogoImage({ src }: { src: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={144}
        height={38}
        priority
        className={LOGO_CLASS}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate fallback: next/image throws on non-allow-listed hosts
    <img
      src={src}
      alt=""
      loading="eager"
      decoding="async"
      className={LOGO_CLASS}
    />
  );
}

const WORDMARK_CLASS = "h-7 w-auto max-w-52 object-contain object-left";

/**
 * `alt` is REQUIRED and non-empty here: with the name rendered as a picture it
 * is no longer text anywhere in the header, so this is the only thing carrying
 * it to a screen reader — and the only thing a reader sees if the file 404s.
 */
function WordmarkImage({ src, alt }: { src: string; alt: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={208}
        height={28}
        priority
        className={WORDMARK_CLASS}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same reason as LogoImage
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      className={WORDMARK_CLASS}
    />
  );
}
