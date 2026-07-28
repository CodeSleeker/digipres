import type { BusinessProfile } from "@/types/business";

export function FloatingCta({ business }: { business: BusinessProfile }) {
  const { floatingCta } = business;

  return (
    <a
      href={floatingCta.href}
      className="fixed bottom-8 right-8 z-[999] flex animate-float-cta items-center gap-3 bg-gold px-6 py-4 font-heading text-[0.9rem] tracking-[2px] text-black shadow-[0_8px_32px_rgba(201,169,110,0.4)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(201,169,110,0.5)] max-[768px]:bottom-4 max-[768px]:right-4 max-[768px]:px-[1.2rem] max-[768px]:py-[0.8rem] max-[768px]:text-[0.8rem] max-[480px]:bottom-3 max-[480px]:right-3 max-[480px]:px-4 max-[480px]:py-[0.7rem] max-[480px]:text-[0.75rem] max-[480px]:tracking-[1px]"
    >
      {floatingCta.label}
    </a>
  );
}
