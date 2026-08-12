import type { CSSProperties } from "react";
import type { BusinessProfile } from "@/types/business";
import { Logo } from "../components/logo";

export function SiteFooter({ business }: { business: BusinessProfile }) {
  const { footer, retreat } = business;
  const place = retreat?.place;

  /*
   * The mockup's "Connect" column, rendered only when there is something real
   * to put in it.
   *
   * The socials are derived from the tenant's own columns (lib/website/
   * build-profile.ts), which deliberately provides NO fallback to the
   * template's demo links — so a business that hasn't filled them in gets no
   * column rather than a row of icons pointing at "#".
   */
  const columns = footer.columns.length + (footer.socials.length ? 1 : 0);

  return (
    <footer className="lodge-on-dark bg-bark pb-10 pt-[clamp(4rem,8vw,6.5rem)] text-[rgba(245,241,232,0.72)]">
      <div className="lodge-shell">
        {/* The column count is content, so it arrives as a custom property
            rather than an inline `grid-template-columns` — an inline style
            would outrank the two responsive classes below and the footer would
            keep its desktop columns on a phone. */}
        <div
          className="grid grid-cols-[1.6fr_repeat(var(--lodge-footer-cols),1fr)] gap-[clamp(2.5rem,6vw,5rem)] max-[960px]:grid-cols-2 max-[520px]:grid-cols-1"
          style={{ "--lodge-footer-cols": columns } as CSSProperties}
        >
          <div className="max-[960px]:col-span-full">
            <Logo business={business} onDark wordClassName="text-[1.5rem]" />
            <p className="mt-[1.3rem] max-w-[30ch] text-[0.95rem] font-light text-[rgba(245,241,232,0.6)]">
              {footer.description}
            </p>
            {place && (
              <address className="mt-8 text-[0.72rem] uppercase not-italic leading-[2.1] tracking-[0.16em] text-[rgba(245,241,232,0.52)]">
                {place.locality}
                <br />
                {place.country}
              </address>
            )}
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-6 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[rgba(245,241,232,0.58)]">
                {column.title}
              </h2>
              <ul className="grid gap-3">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-[0.9rem] font-light text-[rgba(245,241,232,0.78)] transition-colors duration-[400ms] hover:text-ivory"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {footer.socials.length > 0 && (
            <div>
              <h2 className="mb-6 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[rgba(245,241,232,0.58)]">
                Connect
              </h2>
              <ul className="grid gap-3">
                {footer.socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.9rem] font-light text-[rgba(245,241,232,0.78)] transition-colors duration-[400ms] hover:text-ivory"
                    >
                      {social.ariaLabel}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-[clamp(3rem,6vw,5rem)] flex flex-wrap justify-between gap-4 border-t border-[var(--lodge-rule-invert)] pt-[1.8rem] text-[0.7rem] tracking-[0.12em] text-[rgba(245,241,232,0.58)]">
          <p>
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          {footer.credit && <p>{footer.credit}</p>}
        </div>
      </div>
    </footer>
  );
}
