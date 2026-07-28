import Image from "next/image";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The fill-image layer used by tenant templates (replaces the old CSS
 * `background-image` divs, which were invisible to crawlers and screen
 * readers and always shipped full-size).
 *
 * - Allow-listed hosts (lib/images/safe-src.ts) render via `next/image`:
 *   responsive `sizes`, lazy loading, modern formats.
 * - Anything else — owners can paste any URL into the CMS — falls back to a
 *   plain `<img>` with identical classes: unoptimized, but the page never
 *   breaks and the image keeps its `alt`.
 *
 * Renders nothing for an empty src. The parent must be `position: relative`
 * with a size (aspect ratio, grid track, or absolute inset), exactly as the
 * background divs required. Pass `alt=""` for purely decorative images.
 */
export function TenantImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Required for meaningful responsive loading, e.g. "(max-width: 768px) 100vw, 25vw". */
  sizes?: string;
  /** Set on the LCP image only (the hero). */
  priority?: boolean;
}) {
  if (!src) return null;

  if (isOptimizableSrc(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  // Unknown host: same layout contract as `fill`, no optimizer involved.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate fallback: next/image throws on non-allow-listed hosts
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
