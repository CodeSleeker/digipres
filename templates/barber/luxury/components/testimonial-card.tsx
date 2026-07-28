import type { Testimonial } from "@/types/business";
import { cn } from "@/lib/utils";

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Testimonial;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative border border-dark-border bg-dark p-10 transition-all duration-[400ms]",
        "hover:-translate-y-1 hover:border-gold/15",
        "max-[768px]:px-6 max-[768px]:py-8 max-[768px]:hover:translate-y-0",
        className,
      )}
    >
      <div className="absolute left-8 top-6 font-display text-[4rem] leading-none text-gold opacity-[0.15]">
        &ldquo;
      </div>
      <div
        className="mb-5 flex gap-1 text-[0.85rem] text-gold"
        aria-label={`${testimonial.rating} out of 5 stars`}
      >
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <span key={i} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="mb-6 text-[0.95rem] font-light italic leading-[1.8] text-gray-light">
        {testimonial.text}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-dark-border font-heading text-[1.1rem] text-gold">
          {testimonial.initials}
        </div>
        <div>
          <h5 className="font-heading text-base tracking-[1px]">
            {testimonial.author}
          </h5>
          <p className="text-[0.75rem] tracking-[1px] text-gray">
            {testimonial.meta}
          </p>
        </div>
      </div>
    </div>
  );
}
