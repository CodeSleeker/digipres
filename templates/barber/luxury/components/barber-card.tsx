import type { Barber } from "@/types/business";
import { cn } from "@/lib/utils";
import { TenantImage } from "@/components/ui/tenant-image";

export function BarberCard({
  barber,
  className,
}: {
  barber: Barber;
  className?: string;
}) {
  return (
    <div
      className={cn("group relative cursor-pointer overflow-hidden", className)}
    >
      <div className="relative aspect-[3/4] overflow-hidden max-[480px]:aspect-[4/3]">
        <TenantImage
          src={barber.image}
          alt={`${barber.name}, ${barber.role}`}
          sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-top brightness-[0.7] saturate-[0.8] transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:brightness-[0.5] group-hover:saturate-[0.6] max-[768px]:group-hover:scale-100"
        />
      </div>
      <div className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgba(10,10,10,0.95)_0%,transparent_50%)] p-8 max-[768px]:p-5">
        <h3 className="mb-1 font-heading text-[1.6rem] tracking-[2px] max-[768px]:text-[1.3rem]">
          {barber.name}
        </h3>
        <div className="mb-4 text-[0.7rem] uppercase tracking-[3px] text-gold">
          {barber.role}
        </div>
        <p className="max-h-0 overflow-hidden text-[0.85rem] leading-[1.6] text-gray transition-[max-height] duration-500 group-hover:max-h-[100px] max-[768px]:max-h-[60px] max-[768px]:text-[0.75rem]">
          {barber.bio}
        </p>
        <div className="mt-4 flex translate-y-[10px] gap-3 opacity-0 transition-all delay-100 duration-[400ms] group-hover:translate-y-0 group-hover:opacity-100 max-[768px]:translate-y-0 max-[768px]:opacity-100">
          {barber.socials.map((social) => (
            <a
              key={social.ariaLabel}
              href={social.href}
              aria-label={social.ariaLabel}
              className="flex h-8 w-8 items-center justify-center border border-dark-border text-[0.8rem] text-gray transition-all duration-300 hover:border-gold hover:bg-gold hover:text-black"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
