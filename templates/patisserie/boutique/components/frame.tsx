import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";

/**
 * The media frame (mockup `.frame`).
 *
 * The tinted gradient sits BEHIND the photograph rather than being swapped in
 * by script when one fails: a missing or expired image then degrades to a
 * branded panel with its alt text on top, with no JS involved and nothing to
 * hydrate. That is the whole of the mockup's `.is-broken` behaviour, minus the
 * error listener.
 *
 * `group` is declared here so `group-hover:` on the image works whether the
 * caller wraps the frame in a card or not; a caller that wants the zoom driven
 * by an outer hover passes `zoom={false}` and handles it itself.
 */
export function Frame({
  src,
  alt,
  className,
  imageClassName,
  sizes,
  priority,
  zoom = true,
  style,
  children,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  zoom?: boolean;
  /** For a shape computed from content — a masonry tile's own proportions. */
  style?: CSSProperties;
  /** Overlays: a rank badge, a caption, a scrim. */
  children?: ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn(
        "relative isolate block overflow-hidden rounded-[22px]",
        "bg-[linear-gradient(135deg,var(--color-beige)_0%,var(--color-warm-wash)_55%,var(--color-pink-wash)_100%)]",
        className,
      )}
    >
      <TenantImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={cn(
          "transition-transform duration-[1100ms] ease-[cubic-bezier(.16,1,.3,1)]",
          zoom && "group-hover:scale-[1.055]",
          imageClassName,
        )}
      />
      {children}
    </div>
  );
}
