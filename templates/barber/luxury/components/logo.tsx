import Image from "next/image";
import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * The site's identity mark: the owner's uploaded logo when there is one, the
 * gold initial tile when there isn't.
 *
 * The wordmark text is rendered either way. It is what makes the header
 * indexable and announced — an image alone would leave the business name out of
 * the DOM entirely — and it is what the reader still sees if the upload 404s.
 * So the image carries `alt=""`: it duplicates adjacent text rather than adding
 * information.
 */
export function Logo({
  business,
  className,
}: {
  business: BusinessProfile;
  className?: string;
}) {
  const { logoUrl, initial, namePrimary, nameAccent } = business.brand;

  return (
    <a href="#" className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <LogoImage src={logoUrl} />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold font-heading text-[1.5rem] tracking-[1px] text-black max-[480px]:h-9 max-[480px]:w-9 max-[480px]:text-[1.2rem]">
          {initial}
        </div>
      )}
      <div className="font-heading text-[1.35rem] tracking-[3px] text-white max-[480px]:text-[1.1rem] max-[480px]:tracking-[2px]">
        {namePrimary} <span className="text-gold">{nameAccent}</span>
      </div>
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
