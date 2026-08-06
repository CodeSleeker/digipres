import type { BusinessProfile } from "@/types/business";
import { Logo } from "../components/logo";
import { LinkUnderline } from "../components/buttons";
import { externalLinkProps } from "../components/section-head";
import { Heart, SocialIcon } from "../components/icons";
import { NewsletterSignup } from "./newsletter-signup";

export function SiteFooter({ business }: { business: BusinessProfile }) {
  const { footer, patisserie } = business;
  const note = patisserie?.footerNote;

  return (
    <footer className="bg-ink pt-[clamp(3.5rem,2rem+5vw,5.5rem)] text-[rgba(255,253,248,0.62)]">
      <div className="pastry-shell">
        <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_1.3fr] gap-10 border-b border-[rgba(255,253,248,0.12)] pb-12 max-[900px]:grid-cols-2 max-[900px]:gap-9 max-[520px]:grid-cols-1">
          <div>
            <Logo business={business} onDark />
            <p className="mt-5 max-w-[30ch] text-[0.875rem]">
              {footer.description}
            </p>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-[1.15rem] text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[rgba(255,253,248,0.5)]">
                {column.title}
              </h2>
              <ul className="grid list-none gap-[0.7rem] p-0 text-[0.875rem]">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      href={link.href}
                      {...externalLinkProps(link.href)}
                      className="transition-colors duration-300 hover:text-paper"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/*
           * The mockup's fourth column, in one of two states.
           *
           * The real sign-up when this tenant's sending domain is verified —
           * `buildFooter` drops `newsletter` entirely otherwise, so a shop that
           * cannot send never renders a box that would collect addresses and
           * then go silent.
           *
           * Without one, the static note: the same copy, pointing at the form
           * that does reach the shop.
           */}
          {footer.newsletter ? (
            <NewsletterSignup
              business={business}
              newsletter={footer.newsletter}
            />
          ) : (
            note && (
              <div>
                <h2 className="mb-[1.15rem] text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[rgba(255,253,248,0.5)]">
                  {note.title}
                </h2>
                <p className="mb-4 text-[0.875rem]">{note.text}</p>
                <LinkUnderline
                  href={note.cta.href}
                  className="text-paper"
                  {...externalLinkProps(note.cta.href)}
                >
                  {note.cta.label}
                </LinkUnderline>
              </div>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 py-7 text-[0.78rem] text-[rgba(255,253,248,0.45)]">
          <p>
            © {new Date().getFullYear()} {footer.copyright} <Heart />
          </p>
          <div className="flex flex-wrap gap-6">
            {footer.credit && <span>{footer.credit}</span>}
            {footer.socials.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.ariaLabel}
                className="transition-colors duration-300 hover:text-paper"
              >
                <SocialIcon label={social.label} />
              </a>
            ))}
            <a
              href="#top"
              className="transition-colors duration-300 hover:text-paper"
            >
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
