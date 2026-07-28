import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../components/section-heading";
import { TestimonialCard } from "../components/testimonial-card";
import { revealDelay } from "../lib/reveal";

export function Testimonials({ business }: { business: BusinessProfile }) {
  const { testimonials } = business;

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-charcoal py-[var(--section-pad)]"
    >
      <div className="site-container">
        <SectionHeading {...testimonials.heading} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 max-[768px]:grid-cols-1">
          {testimonials.items.map((testimonial, i) => (
            <TestimonialCard
              key={testimonial.author}
              testimonial={testimonial}
              className={cn("reveal", revealDelay(i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
