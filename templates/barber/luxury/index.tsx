import type { BusinessProfile } from "@/types/business";
import { ScrollReveal } from "./components/scroll-reveal";
import { SiteHeader } from "./sections/site-header";
import { Hero } from "./sections/hero";
import { HeroVideo } from "./sections/hero-video";
import { Marquee } from "./sections/marquee";
import { Services } from "./sections/services";
// Craft is hidden for now — see the note at its render site below.
// import { Craft } from "./sections/craft";
import { About } from "./sections/about";
import { Barbers } from "./sections/barbers";
import { Gallery } from "./sections/gallery";
import { Products } from "./sections/products";
import { Testimonials } from "./sections/testimonials";
import { CtaBanner } from "./sections/cta-banner";
import { Contact } from "./sections/contact";
import { SiteFooter } from "./sections/site-footer";
import { FloatingCta } from "./sections/floating-cta";

/**
 * Barber · "Luxury" template.
 *
 * A reusable, tenant-agnostic industry website migrated 1:1 from
 * templates/barber/html/mockup.html. Pure presentation — all content arrives
 * via the `business` prop.
 */
export function LuxuryBarberTemplate({
  business,
}: {
  business: BusinessProfile;
}) {
  return (
    <>
      <ScrollReveal />
      {/* Bypass the fixed header + nav; visible only when focused (2.4.1). */}
      <a
        href="#main"
        className="sr-only z-[1001] bg-gold px-4 py-2 font-heading text-sm tracking-[2px] text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-white"
      >
        Skip to content
      </a>
      <SiteHeader business={business} />
      <main id="main">
        {/* Two interchangeable scrub sources — the client supplies whichever
            asset they have. Absent `heroMedia` keeps the frame sequence. */}
        {business.hero.heroMedia === "video" ? (
          <HeroVideo business={business} />
        ) : (
          <Hero business={business} />
        )}
        <Marquee business={business} />
        <Services business={business} />
        {/* Craft section temporarily hidden at the client's request. The
            section, its scroll hook, and its `craft` content all remain intact
            — restore by uncommenting this line and the import above. */}
        {/* <Craft business={business} /> */}
        <About business={business} />
        <Barbers business={business} />
        <Gallery business={business} />
        <Products business={business} />
        <Testimonials business={business} />
        <CtaBanner business={business} />
        <Contact business={business} />
      </main>
      <SiteFooter business={business} />
      <FloatingCta business={business} />
    </>
  );
}
