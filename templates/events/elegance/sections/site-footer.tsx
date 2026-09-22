import type { BusinessProfile, FooterColumn } from "@/types/business";
import { contactLine } from "@/lib/website/contact-line";
import { SOCIALS_DETAIL_TITLE } from "@/lib/website/build-profile";
import { Logo } from "../components/logo";
import { DetailIcon, SocialIcon } from "../components/icons";

/**
 * The mockup's four-column footer: the brand lockup over two columns, an
 * "Explore" list, the contact details, and a bottom rule carrying the
 * copyright, the credit and the legal links.
 *
 * The contact column is built from `contact.details` rather than a footer
 * column, which is how the mockup draws it — an icon per line, in gold, with
 * the address, the hours and the email. Keeping it derived means an owner who
 * corrects their opening hours in the CMS corrects them in both places.
 *
 * CONTRAST. The mockup sets this whole footer in white at 40% and 30% on the
 * charcoal, which measure 3.8:1 and 2.7:1 — under AA for text this size, and
 * the links are the ones people are trying to hit. Raised to 55% and 50%; the
 * footer still recedes, it is simply readable. Same trade as the retreat's
 * sage and clay tokens in app/globals.css.
 */
export function SiteFooter({ business }: { business: BusinessProfile }) {
  const { footer, contact } = business;

  // The mockup sets Privacy Policy and Terms apart from the link columns, on
  // the bottom rule. They live in the events content under their own name, so
  // the CMS can label the field for what it is, under Footer where an owner
  // is already editing — this used to match a column TITLED "Legal", which
  // meant renaming it moved the links with no warning.
  const legal = footer.legal ?? [];
  const columns = footer.columns;

  /*
   * `buildContactDetails` adds a SOCIALS card listing the platforms as text
   * ("Facebook · Instagram"). This footer already draws them as real links a
   * few inches to the left, so the card would say the same thing twice — once
   * unclickably.
   */
  const details = contact.details.filter(
    (detail) => detail.title !== SOCIALS_DETAIL_TITLE,
  );

  return (
    <footer className="border-t border-white/5 bg-charcoal">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo business={business} onDark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              {footer.description}
            </p>

            {footer.socials.length > 0 && (
              <ul className="mt-8 flex list-none gap-4 p-0">
                {footer.socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      className="social-icon flex h-10 w-10 items-center justify-center rounded-full border border-white/10 hover:border-gold-400 hover:bg-gold-400/10"
                    >
                      <SocialIcon
                        name={social.label}
                        className="h-4 w-4 text-white/60"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {columns.map((column) => (
            <LinkColumn key={column.title} column={column} />
          ))}

          {details.length > 0 && (
            <div>
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-white">
                {contact.label}
              </h2>
              <ul className="list-none space-y-3 p-0">
                {details.map((detail) => (
                  <li key={detail.title} className="flex items-start gap-3">
                    <DetailIcon
                      name={detail.icon}
                      className="mt-0.5 h-4 w-4 flex-none text-gold-400"
                    />
                    <span className="text-sm text-white/55">
                      {detail.lines.map((line, i) => (
                        <ContactLine key={line} line={line} first={i === 0} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          {footer.credit && (
            <p className="text-xs text-white/50">{footer.credit}</p>
          )}
          {legal.length > 0 && (
            <ul className="flex list-none gap-6 p-0">
              {legal.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    className="text-xs text-white/50 transition-colors hover:text-gold-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

function LinkColumn({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-white">
        {column.title}
      </h2>
      <ul className="list-none space-y-3 p-0">
        {column.links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <a
              href={link.href}
              className="text-sm text-white/55 transition-colors hover:text-gold-400"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One line of a contact detail, tappable where that means something.
 *
 * The mockup draws these as plain text — fine in a picture, wrong on a phone,
 * where the email in the footer is the fastest way to start a conversation.
 */
function ContactLine({ line, first }: { line: string; first: boolean }) {
  const { href } = contactLine(line);

  return (
    <>
      {!first && <br />}
      {href ? (
        <a href={href} className="transition-colors hover:text-gold-400">
          {line}
        </a>
      ) : (
        line
      )}
    </>
  );
}
