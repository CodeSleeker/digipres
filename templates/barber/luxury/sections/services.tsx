import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../components/section-heading";
import { ServiceCard } from "../components/service-card";
import { revealDelay } from "../lib/reveal";

export function Services({ business }: { business: BusinessProfile }) {
  const { services } = business;

  return (
    <section id="services" className="relative bg-black py-[var(--section-pad)]">
      <div className="site-container">
        <SectionHeading {...services.heading} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 max-[768px]:grid-cols-1">
          {services.items.map((service, i) => (
            <ServiceCard
              key={service.title}
              service={service}
              className={cn("reveal", revealDelay(i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
