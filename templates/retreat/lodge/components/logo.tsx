import Image from "next/image";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The wordmark (mockup `.brand`): the name in the display serif, letter-spaced
 * and set in caps.
 *
 * Three states rather than the four the other templates have. This design
 * carries NO mark — no monogram tile, no glyph — so there is nothing to fall
 * back to and nothing to invent:
 *
 *   wordmark image   one lockup, no text
 *   logo + name      an uploaded mark set before the words
 *   name only        the approved design
 *
 * ACCESSIBILITY. The name reaches the accessible tree exactly once: as text the
 * mark is decorative (`alt=""`); as an image that image carries the name.
 * `aria-label` names the link itself, which is otherwise announced as whatever
 * the images leave behind.
 */
export function Logo({
  business,
  className,
  wordClassName,
  onDark,
  href = "#top",
}: {
  business: BusinessProfile;
  className?: string;
  /** Size of the word itself, which differs between the header and the footer. */
  wordClassName?: string;
  /** Ivory on a photograph or a bark ground; ink once the header has stuck. */
  onDark?: boolean;
  href?: string;
}) {
  const { logoUrl, wordmarkUrl, namePrimary, nameAccent } = business.brand;
  const name = [namePrimary, nameAccent].filter(Boolean).join(" ");

  return (
    <a
      href={href}
      aria-label={`${name}, home`}
      className={cn("flex items-center gap-[0.7rem]", className)}
    >
      {logoUrl && !wordmarkUrl && <LogoImage src={logoUrl} />}

      {wordmarkUrl ? (
        <WordmarkImage src={wordmarkUrl} alt={name} />
      ) : (
        <span
          className={cn(
            "whitespace-nowrap font-lodge text-[1.42rem] uppercase leading-none tracking-[0.2em] transition-[color,font-size] duration-[600ms] ease-[cubic-bezier(.22,.61,.36,1)]",
            onDark ? "text-ivory" : "text-bark",
            wordClassName,
          )}
        >
          {name}
        </span>
      )}
    </a>
  );
}

/** `object-contain`: a logo cropped to fill a box stops being the logo. */
const LOGO_CLASS = "h-8 w-auto max-w-32 object-contain object-left";

function LogoImage({ src }: { src: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={128}
        height={32}
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
 * `alt` is REQUIRED and non-empty: with the name rendered as a picture it is no
 * longer text anywhere in the header, so this is the only thing carrying it to
 * a screen reader — and the only thing a reader sees if the file 404s.
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
