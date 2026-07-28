import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../components/section-heading";
import { BarberCard } from "../components/barber-card";
import { revealDelay } from "../lib/reveal";

export function Barbers({ business }: { business: BusinessProfile }) {
  const { barbers } = business;

  return (
    <section id="barbers" className="relative bg-black py-[var(--section-pad)]">
      <div className="site-container">
        <SectionHeading {...barbers.heading} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 max-[1024px]:grid-cols-2 max-[768px]:grid-cols-2 max-[768px]:gap-4 max-[480px]:grid-cols-1">
          {barbers.items.map((barber, i) => (
            <BarberCard
              key={barber.name}
              barber={barber}
              className={cn("reveal", revealDelay(i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
