import type { Product } from "@/types/business";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden border border-dark-border bg-dark transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-1.5 hover:border-gold/15 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]",
        "max-[768px]:hover:translate-y-0 max-[768px]:hover:shadow-none",
        className,
      )}
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--color-charcoal),var(--color-dark))] max-[768px]:aspect-[4/3]">
        <div
          aria-hidden="true"
          className="text-[3.5rem] opacity-[0.15] transition-all duration-500 group-hover:rotate-[5deg] group-hover:scale-[1.15] group-hover:opacity-[0.25]"
        >
          {product.icon}
        </div>
        {product.tag && (
          <div className="absolute left-4 top-4 bg-gold px-[0.7rem] py-[0.3rem] text-[0.6rem] font-semibold uppercase tracking-[2px] text-black">
            {product.tag}
          </div>
        )}
      </div>
      <div className="p-6 max-[768px]:p-4">
        <h4 className="mb-[0.4rem] font-heading text-[1.15rem] tracking-[1px] max-[768px]:text-base">
          {product.name}
        </h4>
        <p className="mb-3 text-[0.8rem] text-gray">{product.description}</p>
        <div className="font-heading text-[1.2rem] tracking-[1px] text-gold">
          {product.price}
        </div>
      </div>
    </div>
  );
}
