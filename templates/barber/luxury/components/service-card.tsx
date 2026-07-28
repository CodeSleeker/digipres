import type { Service } from "@/types/business";
import { cn } from "@/lib/utils";

export function ServiceCard({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden border border-dark-border bg-dark px-8 py-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-2 hover:border-gold/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
        "before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:bg-[linear-gradient(90deg,var(--color-gold),transparent)] before:opacity-0 before:transition-opacity before:duration-[400ms] before:content-[''] hover:before:opacity-100",
        "max-[768px]:px-6 max-[768px]:py-8 max-[768px]:hover:translate-y-0 max-[768px]:hover:shadow-none",
        className,
      )}
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center border border-dark-border text-2xl text-gold transition-all duration-[400ms] group-hover:border-gold group-hover:bg-gold group-hover:text-black">
        {service.icon}
      </div>
      <h3 className="mb-3 font-heading text-[1.5rem] tracking-[2px]">
        {service.title}
      </h3>
      <p className="mb-5 text-[0.9rem] leading-[1.7] text-gray">
        {service.description}
      </p>
      <div className="font-heading text-[1.4rem] tracking-[1px] text-gold">
        {service.price}{" "}
        <small className="font-body text-[0.7rem] tracking-[1px] text-gray">
          {service.unit}
        </small>
      </div>
    </div>
  );
}
