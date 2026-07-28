import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../components/section-heading";
import { ProductCard } from "../components/product-card";
import { revealDelay } from "../lib/reveal";

export function Products({ business }: { business: BusinessProfile }) {
  const { products } = business;

  return (
    <section id="products" className="relative bg-black py-[var(--section-pad)]">
      <div className="site-container">
        <SectionHeading {...products.heading} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 max-[768px]:grid-cols-2 max-[768px]:gap-4 max-[480px]:grid-cols-1">
          {products.items.map((product, i) => (
            <ProductCard
              key={product.name}
              product={product}
              className={cn("reveal", revealDelay(i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
