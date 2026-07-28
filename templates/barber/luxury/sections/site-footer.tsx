import type { BusinessProfile } from "@/types/business";
import { cn } from "@/lib/utils";
import { Logo } from "../components/logo";

export function SiteFooter({ business }: { business: BusinessProfile }) {
  const { footer } = business;
  const lastIndex = footer.columns.length - 1;

  return (
    <footer className="border-t border-dark-border bg-black pt-16 [padding-bottom:calc(2rem+env(safe-area-inset-bottom))]">
      <div className="site-container">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 border-b border-dark-border pb-12 max-[1024px]:grid-cols-[2fr_1fr_1fr] max-[768px]:grid-cols-2 max-[768px]:gap-8 max-[480px]:grid-cols-1 max-[480px]:gap-6">
          <div className="max-[768px]:col-span-full max-[480px]:col-auto">
            <Logo business={business} className="mb-5" />
            <p className="max-w-[300px] text-[0.9rem] leading-[1.7] text-gray">
              {footer.description}
            </p>
          </div>

          {footer.columns.map((col, i) => (
            <div
              key={col.title}
              className={cn(i === lastIndex && "max-[1024px]:col-span-full")}
            >
              <h4 className="mb-5 font-heading text-[0.9rem] tracking-[3px] text-white">
                {col.title}
              </h4>
              <ul className="list-none">
                {col.links.map((link, j) => (
                  <li key={`${link.label}-${j}`} className="mb-[0.6rem]">
                    <a
                      href={link.href}
                      className="text-[0.85rem] text-gray transition-colors duration-300 hover:text-gold"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-8 max-[768px]:flex-col max-[768px]:gap-4 max-[768px]:text-center">
          <p className="text-[0.75rem] tracking-[1px] text-gray">
            {footer.copyright}
          </p>
          <p className="text-[0.75rem] tracking-[1px] text-gray">
            {footer.credit}
          </p>
          <div className="flex gap-3">
            {footer.socials.map((social) => (
              <a
                key={social.ariaLabel}
                href={social.href}
                aria-label={social.ariaLabel}
                className="flex h-9 w-9 items-center justify-center border border-dark-border text-[0.85rem] text-gray transition-all duration-300 hover:border-gold hover:bg-gold hover:text-black"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
