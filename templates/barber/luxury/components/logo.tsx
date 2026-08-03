import Image from "next/image";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The site's identity: a mark, and the business name beside it.
 *
 * Both halves are independently either an upload or a fallback, which covers
 * every tenant with no extra setting:
 *
 *   logo only        uploaded mark + name as text     (the common case)
 *   wordmark only    one image, no text               (a single lockup)
 *   both             uploaded mark + uploaded wordmark
 *   neither          gold initial tile + name as text
 *
 * ACCESSIBILITY. The name must reach the accessible tree exactly once. When it
 * is text, the mark image is decorative and carries `alt=""` — it would only
 * repeat the words next to it. When the name is an IMAGE, that image carries
 * the name as its `alt` instead. The two branches are why the alt text is
 * computed rather than hard-coded.
 */
export function Logo({
  business,
  className,
}: {
  business: BusinessProfile;
  className?: string;
}) {
  const { logoUrl, wordmarkUrl, initial, namePrimary, nameAccent } =
    business.brand;
  const name = [namePrimary, nameAccent].filter(Boolean).join(" ");

  return (
    <a href="#" className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <LogoImage src={logoUrl} />
      ) : (
        // Suppressed when a wordmark image is doing the whole job: a lockup
        // already contains its own mark, and a tile beside it reads as two
        // competing logos.
        !wordmarkUrl && (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold font-heading text-[1.5rem] tracking-[1px] text-black max-[480px]:h-9 max-[480px]:w-9 max-[480px]:text-[1.2rem]">
            {initial}
          </div>
        )
      )}

      {wordmarkUrl ? (
        <WordmarkImage src={wordmarkUrl} alt={name} />
      ) : (
        <div className="font-heading text-[1.35rem] tracking-[3px] text-white max-[480px]:text-[1.1rem] max-[480px]:tracking-[2px]">
          {namePrimary} <span className="text-gold">{nameAccent}</span>
        </div>
      )}
    </a>
  );
}

/** Shared with both branches so the two renderings can't drift apart. */
const LOGO_CLASS =
  "h-11 w-auto max-w-40 object-contain object-left max-[480px]:h-9 max-[480px]:max-w-32";

/**
 * `object-contain`, not `cover`: a logo cropped to fill a square stops being
 * the logo. A wide wordmark grows sideways (to `max-w-40`) and simply sits
 * shorter than the 44px box.
 *
 * Plain <img> rather than TenantImage — that component is `fill`-positioned for
 * background layers, and this needs intrinsic sizing inside a flex row.
 */
function LogoImage({ src }: { src: string }) {
  if (isOptimizableSrc(src)) {
    // width/height are the box the optimizer targets, not a forced aspect
    // ratio — `w-auto` in LOGO_CLASS hands the real ratio back to the browser.
    return (
      <Image
        src={src}
        alt=""
        width={160}
        height={44}
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

/**
 * Shorter and wider than the mark, because a wordmark is a line of type: it
 * should sit at roughly the cap height of the text it replaces rather than
 * filling the mark's 44px square.
 */
const WORDMARK_CLASS =
  "h-8 w-auto max-w-56 object-contain object-left max-[480px]:h-6 max-[480px]:max-w-40";

/**
 * The name as an image.
 *
 * `alt` is REQUIRED and non-empty here, unlike the mark: with the wordmark
 * rendered as a picture the business name is no longer text anywhere in the
 * header, so this alt is the only thing carrying it to a screen reader, and the
 * only thing a reader sees if the file 404s.
 */
function WordmarkImage({ src, alt }: { src: string; alt: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={224}
        height={32}
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
