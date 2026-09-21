import Image from "next/image";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The brand lockup: the name in gold, the qualifier beside it in a lighter
 * weight — "Elegance by Bem" as the mockup sets it.
 *
 * Four states, all reachable without a setting, matching the other templates'
 * Logo for the same reasons:
 *
 *   wordmark image   one lockup, no text            (a tenant with a full logo)
 *   logo + text      uploaded mark beside the name
 *   text only        the name, set as the mockup does   (the common case)
 *
 * ACCESSIBILITY. The name reaches the accessible tree exactly once. Where it
 * is text the mark is decorative (`alt=""`); where the name is an image, that
 * image carries it. `aria-label` names the link itself, which is otherwise
 * announced as whatever the images leave behind.
 */
export function Logo({
  business,
  className,
  onDark = false,
  href = "#top",
}: {
  business: BusinessProfile;
  className?: string;
  onDark?: boolean;
  href?: string;
}) {
  const { logoUrl, wordmarkUrl, namePrimary, nameAccent } = business.brand;
  const name = [namePrimary, nameAccent].filter(Boolean).join(" ");

  return (
    <a
      href={href}
      aria-label={`${name}, home`}
      className={cn("relative z-10 flex items-center gap-3", className)}
    >
      {logoUrl && !wordmarkUrl && <LogoMark src={logoUrl} />}

      {wordmarkUrl ? (
        <Wordmark src={wordmarkUrl} alt={name} />
      ) : (
        <span
          className={cn(
            "font-serif font-semibold tracking-wide",
            onDark ? "text-2xl" : "text-2xl lg:text-3xl",
          )}
        >
          <span className={onDark ? "text-gold-400" : "text-gold-500"}>
            {namePrimary}
          </span>
          {nameAccent && (
            <span
              className={cn(
                "ml-1 font-light",
                onDark
                  ? "text-lg text-white/50"
                  : "text-lg text-charcoal/60 lg:text-xl",
              )}
            >
              {nameAccent}
            </span>
          )}
        </span>
      )}
    </a>
  );
}

const MARK_CLASS = "h-10 w-auto max-w-32 object-contain object-left";

/** `object-contain`: a logo cropped to fill a box stops being the logo. */
function LogoMark({ src }: { src: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={128}
        height={40}
        priority
        className={MARK_CLASS}
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
      className={MARK_CLASS}
    />
  );
}

const WORDMARK_CLASS = "h-9 w-auto max-w-56 object-contain object-left";

/**
 * `alt` is REQUIRED and non-empty: with the name rendered as a picture it is
 * no longer text anywhere in the header, so this is the only thing carrying it
 * to a screen reader — and the only thing a reader sees if the file 404s.
 */
function Wordmark({ src, alt }: { src: string; alt: string }) {
  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={224}
        height={36}
        priority
        className={WORDMARK_CLASS}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same reason as LogoMark
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      className={WORDMARK_CLASS}
    />
  );
}
