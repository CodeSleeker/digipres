import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";

/**
 * The media frame (mockup `.frame.frame--zoom.reveal-img`).
 *
 * Three things at once, kept together because they are one effect: the clip and
 * its sand-coloured ground, the entrance curtain, and the hover zoom. The
 * curtain and the paired image scale are defined in app/globals.css under
 * `.tpl-retreat .reveal-img` — the classes here are what opt an element into
 * them.
 *
 * The sand ground is not decoration either: it is what a reader sees if the
 * photograph is missing or expired, so a broken image degrades to a branded
 * panel rather than a hole. No script involved and nothing to hydrate.
 *
 * The parent must give the frame a size — an aspect ratio or a grid track —
 * because the image inside fills it absolutely.
 */
export function Frame({
  src,
  alt,
  className,
  sizes,
  priority,
  children,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  /** Set on the LCP image only. */
  priority?: boolean;
  /** Overlays: a caption, a scrim. */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "reveal reveal-img relative isolate block overflow-hidden rounded-[2px] bg-sand",
        className,
      )}
    >
      <TenantImage src={src} alt={alt} sizes={sizes} priority={priority} />
      {children}
    </div>
  );
}
