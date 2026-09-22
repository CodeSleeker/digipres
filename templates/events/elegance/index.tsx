import type { BusinessProfile } from "@/types/business";
import { ScrollReveal } from "./components/scroll-reveal";
import { SiteHeader } from "./sections/site-header";
import { Hero } from "./sections/hero";
import { Portfolio } from "./sections/portfolio";
import { Showcase } from "./sections/showcase";
import { Services } from "./sections/services";
import { Story } from "./sections/story";
import { Testimonials } from "./sections/testimonials";
import { Faq } from "./sections/faq";
import { Inquiry } from "./sections/inquiry";
import { SiteFooter } from "./sections/site-footer";

/**
 * Events · "Elegance" template.
 *
 * A tenant-agnostic industry website converted 1:1 from
 * templates/events/html/index.html — the approved design. Pure presentation:
 * every string, image and option arrives on the `business` prop, and nothing
 * in here talks to a database.
 *
 * Section order is the mockup's, unchanged: the three category cards, the
 * filterable grid of work, the services band, the story, the testimonials,
 * then the closing invitation. The one addition is the enquiry form, which
 * lives inside the closing section because the mockup's CTA there pointed at
 * nothing.
 *
 * The `tpl-events` class on the root is load-bearing, not cosmetic: the
 * platform's base layer paints the document for the dark barber template, and
 * this template's cream page chrome, gold palette and reveal animations all
 * hang off this class in app/globals.css. Removing it leaves the sections
 * rendering on a black page with no transitions.
 */
export function EleganceEventsTemplate({
  business,
}: {
  business: BusinessProfile;
}) {
  return (
    <div className="tpl-events">
      {/* Belt and braces for the reveal gate. app/globals.css opts out via
          `@media (scripting: none)`; this covers browsers that predate that
          media feature, where a reader without script would otherwise be
          shown a page of nothing. Keep the two rules in agreement. */}
      <noscript>
        <style>{`.tpl-events .reveal{opacity:1;transform:none;transition:none}`}</style>
      </noscript>
      <ScrollReveal />
      {/* Bypasses the fixed header and the whole nav; visible only when
          focused (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only z-[201] rounded-full bg-charcoal px-[1.1rem] py-[0.7rem] text-[0.85rem] text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-gold-400"
      >
        Skip to content
      </a>

      <SiteHeader business={business} />

      <main id="main">
        <span id="top" />
        <Hero business={business} />
        <Portfolio business={business} />
        <Showcase business={business} />
        <Services business={business} />
        <Story business={business} />
        <Testimonials business={business} />
        {/* Objections answered immediately before the enquiry form, which is
            where a reader meets them. Renders nothing without questions. */}
        <Faq business={business} />
        <Inquiry business={business} />
      </main>

      <SiteFooter business={business} />
    </div>
  );
}
