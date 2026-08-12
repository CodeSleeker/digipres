import type { BusinessProfile } from "@/types/business";
import { ScrollReveal } from "./components/scroll-reveal";
import { SiteHeader } from "./sections/site-header";
import { Hero } from "./sections/hero";
import { About } from "./sections/about";
import { Stay } from "./sections/stay";
import { ImageBreak } from "./sections/image-break";
import { Gallery } from "./sections/gallery";
import { Experience } from "./sections/experience";
import { Journal } from "./sections/journal";
import { Location } from "./sections/location";
import { Quote } from "./sections/quote";
import { BookingCta } from "./sections/booking-cta";
import { SiteFooter } from "./sections/site-footer";

/**
 * Retreat · "Lodge" template.
 *
 * A reusable, tenant-agnostic industry website migrated 1:1 from
 * templates/retreat/html/index.html. Pure presentation — all content arrives
 * via the `business` prop.
 *
 * The `tpl-retreat` class on the root is load-bearing, not cosmetic: the
 * platform's base layer paints the document for the dark barber template, and
 * the light page chrome in app/globals.css hangs off this class (see the note
 * there). Removing it leaves the sections rendering on a black page.
 *
 * Section ORDER is the design's argument and shouldn't be rearranged casually:
 * the property, then a pause, then the pictures, then how it feels, then where
 * it is, then the invitation. The booking CTA is last because everything before
 * it is the reason to press it.
 */
export function LodgeRetreatTemplate({
  business,
}: {
  business: BusinessProfile;
}) {
  return (
    <div className="tpl-retreat">
      {/* Belt and braces for the reveal gate. app/globals.css opts out via
          `@media (scripting: none)`; this covers browsers that predate that
          media feature, where a reader without script would otherwise be shown
          a page of nothing. Keep the two rules in agreement. */}
      <noscript>
        <style>{`.tpl-retreat .reveal{opacity:1;transform:none;transition:none}.tpl-retreat .reveal-img::after{display:none}.tpl-retreat .reveal-img img{transform:none}`}</style>
      </noscript>
      <ScrollReveal />
      {/* Bypasses the fixed header and the whole nav; visible only when
          focused (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only z-[201] rounded-[2px] bg-bark px-[1.1rem] py-[0.7rem] text-[0.8rem] uppercase tracking-[0.16em] text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-clay"
      >
        Skip to content
      </a>

      <SiteHeader business={business} />

      <main id="main">
        <span id="top" />
        <Hero business={business} />
        <About business={business} />
        <Stay business={business} />
        <ImageBreak business={business} />
        <Gallery business={business} />
        <Experience business={business} />
        {/* What is happening NOW, between how the place feels and where it is:
            the reader has just been told what a stay is like, and this is the
            evidence that someone is actually there. Renders nothing until an
            owner writes an entry. */}
        <Journal business={business} />
        <Location business={business} />
        <Quote business={business} />
        <BookingCta business={business} />
      </main>

      <SiteFooter business={business} />
    </div>
  );
}
