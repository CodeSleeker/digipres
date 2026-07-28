import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";

export function Logo({
  business,
  className,
}: {
  business: BusinessProfile;
  className?: string;
}) {
  return (
    <a href="#" className={cn("flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold font-heading text-[1.5rem] tracking-[1px] text-black max-[480px]:h-9 max-[480px]:w-9 max-[480px]:text-[1.2rem]">
        {business.brand.initial}
      </div>
      <div className="font-heading text-[1.35rem] tracking-[3px] text-white max-[480px]:text-[1.1rem] max-[480px]:tracking-[2px]">
        {business.brand.namePrimary}{" "}
        <span className="text-gold">{business.brand.nameAccent}</span>
      </div>
    </a>
  );
}
