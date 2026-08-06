import type { BusinessProfile } from "@/types/business";
import { ScrollReveal } from "./components/scroll-reveal";
import { SiteHeader } from "./sections/site-header";
import { Hero } from "./sections/hero";
import { Featured } from "./sections/featured";
import { BestSellers } from "./sections/best-sellers";
import { CustomCakes } from "./sections/custom-cakes";
import { Gallery } from "./sections/gallery";
import { Testimonials } from "./sections/testimonials";
import { About } from "./sections/about";
import { Faq } from "./sections/faq";
import { Contact } from "./sections/contact";
import { SiteFooter } from "./sections/site-footer";

/**
 * Patisserie · "Boutique" template.
 *
 * A reusable, tenant-agnostic industry website migrated 1:1 from
 * templates/patisserie/html/index.html. Pure presentation — all content arrives
 * via the `business` prop.
 *
 * The `tpl-patisserie` class on the root is load-bearing, not cosmetic: the
 * platform's base layer paints the document for the dark barber template, and
 * the light page chrome in app/globals.css hangs off this class (see the note
 * there). Removing it leaves the sections rendering on a black page.
 */
export function BoutiquePatisserieTemplate({
  business,
}: {
  business: BusinessProfile;
}) {
  return (
    <div className="tpl-patisserie">
      {/* Belt and braces for the reveal gate. app/globals.css opts out via
          `@media (scripting: none)`; this covers browsers that predate that
          media feature, where a reader without script would otherwise be shown
          a page of nothing. Keep the two rules in agreement. */}
      <noscript>
        <style>{`.tpl-patisserie .reveal{opacity:1;transform:none;transition:none}`}</style>
      </noscript>
      <ScrollReveal />
      {/* Bypasses the fixed header and the whole nav; visible only when
          focused (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only z-[201] rounded-full bg-ink px-[1.1rem] py-[0.7rem] text-[0.85rem] text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-mint-deep"
      >
        Skip to content
      </a>

      <SiteHeader business={business} />

      <main id="main">
        <span id="top" />
        <Hero business={business} />
        <Featured business={business} />
        <BestSellers business={business} />
        <CustomCakes business={business} />
        <Gallery business={business} />
        <Testimonials business={business} />
        <About business={business} />
        {/* Answers the objections immediately before the enquiry form, which is
            where a reader expects them. Renders nothing without questions. */}
        <Faq business={business} />
        <Contact business={business} />
      </main>

      <SiteFooter business={business} />
    </div>
  );
}
