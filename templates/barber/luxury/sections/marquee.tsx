import type { BusinessProfile } from "@/types/business";

export function Marquee({ business }: { business: BusinessProfile }) {
  // Duplicated once so the -50% keyframe loops seamlessly (mockup parity).
  const items = [...business.marquee, ...business.marquee];

  return (
    <div className="overflow-hidden border-y border-dark-border bg-charcoal py-6">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-8 px-8 font-heading text-[1.1rem] uppercase tracking-[4px] text-gray max-[768px]:gap-5 max-[768px]:px-5 max-[768px]:text-[0.9rem] max-[768px]:tracking-[3px] max-[480px]:gap-4 max-[480px]:px-4 max-[480px]:text-[0.8rem] max-[480px]:tracking-[2px]"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
