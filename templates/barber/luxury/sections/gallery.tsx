import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionLabel, SectionTitle } from "../components/section-heading";
import { GalleryItem } from "../components/gallery-item";
import { revealDelay } from "../lib/reveal";

export function Gallery({ business }: { business: BusinessProfile }) {
  const { gallery } = business;

  return (
    <section
      id="gallery"
      className="overflow-hidden bg-charcoal py-[var(--section-pad)]"
    >
      <div className="site-container">
        <div className="mb-12">
          <SectionLabel className="reveal">
            {gallery.heading.label}
          </SectionLabel>
          <SectionTitle className="reveal reveal-delay-1">
            {gallery.heading.title}
          </SectionTitle>
        </div>

        <div className="grid grid-cols-4 grid-rows-[repeat(2,280px)] gap-4 max-[1024px]:grid-rows-[repeat(2,240px)] max-[768px]:grid-cols-2 max-[768px]:grid-rows-[repeat(4,180px)] max-[768px]:gap-3 max-[480px]:grid-cols-1 max-[480px]:grid-rows-none max-[480px]:auto-rows-[160px]">
          {gallery.items.map((item, i) => (
            <GalleryItem
              key={item.title}
              item={item}
              className={cn("reveal", revealDelay(i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
