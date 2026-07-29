import type { GalleryItem as GalleryItemType } from "@/types/business";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";

export function GalleryItem({
  item,
  className,
}: {
  item: GalleryItemType;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "group relative m-0 overflow-hidden",
        item.wide && "col-span-2 max-[768px]:col-span-1",
        className,
      )}
    >
      {/* Real <img> with alt — indexable and announced; the figcaption below
          adds the credit. Height comes from the gallery's grid tracks. */}
      <TenantImage
        src={item.image}
        alt={item.title}
        sizes={
          item.wide
            ? "(max-width: 480px) 100vw, 50vw"
            : "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
        }
        className="object-center brightness-75 transition-all duration-[600ms] group-hover:scale-[1.08] group-hover:brightness-90"
      />
      {/* Caption is always in the DOM (so assistive tech reads it); the opacity
          transition is a sighted-mouse flourish, revealed on hover or focus. */}
      <figcaption className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgba(10,10,10,0.8)_0%,transparent_60%)] p-6 opacity-0 transition-opacity duration-[400ms] group-focus-within:opacity-100 group-hover:opacity-100 max-[768px]:opacity-100">
        <span className="font-heading text-[1.2rem] tracking-[2px]">
          {item.title}
        </span>
        {item.caption && (
          <span className="mt-1 text-[0.8rem] font-light leading-snug text-gray-light">
            {item.caption}
          </span>
        )}
        <span className="mt-1 text-[0.75rem] uppercase tracking-[2px] text-gold">
          {item.by}
        </span>
      </figcaption>
    </figure>
  );
}
