import type { BusinessProfile } from "@/types/business";

const UNSPLASH = "https://images.unsplash.com";

/**
 * Development seed content for "Gloria's", and the merge base for any tenant on
 * the retreat/lodge template.
 *
 * Extracted verbatim from templates/retreat/html/index.html. In production this
 * data comes from the database keyed by the request host; for local dev it is
 * resolved by slug via DEV_BUSINESS_SLUG (see app/page.tsx).
 *
 * The photography is Unsplash placeholder imagery, exactly as the approved
 * mockup ships it — an allow-listed host (lib/images/safe-src.ts), so it goes
 * through the image optimizer and a tenant's own uploads replace it in place.
 *
 * WHAT IS DELIBERATELY EMPTY. This template declares only `heroBackdrop`
 * (templates/registry.ts), so every other optional field is left blank rather
 * than filled with something the page has nowhere to show: no prices on the
 * stay cards, no button or badge under the story, no team, products,
 * testimonials or FAQ. A field the CMS won't offer must not carry content the
 * owner can't maintain — see the invariant in tests/retreat-template.test.ts.
 */
export const gloria: BusinessProfile = {
  slug: "gloria",
  brand: {
    namePrimary: "Gloria's",
    nameAccent: "",
    initial: "G",
    logoUrl: null,
    wordmarkUrl: null,
  },
  seo: {
    title: "Gloria's | A quiet escape in the heart of Dahilayan",
    description:
      "A private vacation home in Dahilayan, Bukidnon. Slow mornings, cool mountain air, and a peaceful space made for the people who matter most.",
  },
  nav: [
    { label: "Home", href: "#top" },
    { label: "The Stay", href: "#stay" },
    { label: "Gallery", href: "#gallery" },
    { label: "Experience", href: "#experience" },
    // Filtered out by build-profile for tenants whose journal is empty.
    { label: "Journal", href: "#journal" },
    { label: "Location", href: "#location" },
  ],
  navCta: { label: "Book Your Stay", href: "#book" },
  hero: {
    overline: "A private retreat in Dahilayan",
    titleLines: [
      { text: "A quiet escape" },
      // `stroke` is the barber template's gold outline; here the flag drives
      // the Cormorant italic, which is this design's equivalent emphasis.
      { text: "in the heart of Dahilayan.", stroke: true },
    ],
    description:
      "Slow mornings, cool mountain air, and a private space made for the people who matter most.",
    primaryCta: { label: "Book Your Stay", href: "#book", arrow: true },
    secondaryCta: { label: "Explore Gloria's", href: "#about", arrow: true },
    // The figures row belongs to the barber hero; this one carries the place
    // line instead, so this stays empty rather than inventing numbers.
    stats: [],
    image: `${UNSPLASH}/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=80`,
    imageAlt:
      "A modern timber and glass house glowing warmly at dusk beneath a large tree",
  },
  // No marquee on this template.
  marquee: [],
  about: {
    label: "Welcome to Gloria's",
    titleLines: ["Some places are meant", "to help you slow down."],
    text: "Tucked into the cool highlands of Dahilayan, Gloria's is a private retreat made for unhurried mornings, long conversations, and time that belongs entirely to you.",
    paragraphs: [
      "No lobby, no crowd, no schedule. Just a warm house in the mountains, kept quiet for one group at a time.",
    ],
    // The barber's tick list, set here as the line of small caps under the
    // story — the same content in the form this design has room for.
    features: ["Private Stay", "Dahilayan", "Bukidnon"],
    image: `${UNSPLASH}/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80`,
    imageAlt:
      "The entrance of a modern house clad in dark panels and warm timber slats, lit from within at dusk",
    // Rendered by the other templates; this story has no button and no badge.
    cta: { label: "", href: "" },
    badgeValue: "",
    badgeLabel: "",
  },
  services: {
    heading: {
      label: "The Stay",
      title: "Your own place in the mountains.",
      subtitle:
        "Gloria's is kept simple on purpose: comfortable rooms, open shared spaces, and wide views of the highlands to wake up to.",
    },
    // Numbered by position at render time. No price, glyph or photograph: a
    // private house is booked whole, not priced per line.
    items: [
      {
        icon: "",
        title: "Private Retreat",
        description:
          "A space reserved for you and your group alone, for as long as you stay.",
        price: "",
        unit: "",
      },
      {
        icon: "",
        title: "Designed for Togetherness",
        description:
          "Comfortable shared spaces where family and friends naturally gather.",
        price: "",
        unit: "",
      },
      {
        icon: "",
        title: "Cool Mountain Setting",
        description:
          "Wake up surrounded by the calm, cool atmosphere of Dahilayan.",
        price: "",
        unit: "",
      },
      {
        icon: "",
        title: "Modern Comfort",
        description:
          "A thoughtful balance of contemporary convenience and a warm, home-like feel.",
        price: "",
        unit: "",
      },
    ],
  },
  // No team section — a private house has no staff page.
  barbers: { heading: { label: "", title: "" }, items: [] },
  gallery: {
    heading: {
      label: "A glimpse of Gloria's",
      title: "Come in. Make yourself at home.",
      subtitle: "Select an image to view",
    },
    /*
     * The mockup's five-tile composition, reproduced from ordinary content: the
     * first four cycle through the mosaic shapes and the last is marked `wide`,
     * which is the full-width slot. See templates/retreat/lodge/sections/gallery.
     */
    items: [
      {
        title: "Evenings",
        by: "",
        caption: "Evening on the deck",
        image: `${UNSPLASH}/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=2000&q=80`,
        alt: "A living and dining space opening onto a timber deck at dusk, with the table set for a meal",
      },
      {
        title: "Quiet corners",
        by: "",
        caption: "A bathroom that takes its time",
        image: `${UNSPLASH}/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=80`,
        alt: "A calm bathroom in dark stone with a freestanding tub below a long window onto the trees",
      },
      {
        title: "Bedroom",
        by: "",
        caption: "Bedroom, morning light",
        image: `${UNSPLASH}/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1800&q=80`,
        alt: "A quiet bedroom with linen bedding, a timber headboard and a warm bedside lamp",
      },
      {
        title: "Kitchen",
        by: "",
        caption: "The kitchen",
        image: `${UNSPLASH}/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1800&q=80`,
        alt: "A pale kitchen with an island, timber stools and oak cabinetry",
      },
      {
        title: "The view",
        by: "",
        caption: "Highland views",
        image: `${UNSPLASH}/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2400&q=80`,
        alt: "Sunlight falling through tall trees across a forest floor",
        wide: true,
      },
    ],
  },
  /*
   * Dated notes. Seeded so the section is visible out of the box and a new
   * owner can see the shape of an entry before writing their own.
   *
   * Written as ATMOSPHERE rather than as claims — the weather, the light, the
   * quiet — for the same reason the FAQ ships empty: a seeded entry appears
   * under a real business's name, and "we finished the new deck" would be a
   * statement of fact about a property nobody has checked. Anything specific
   * enough to be wrong doesn't belong in a default.
   *
   * The dates will age. That is inherent to a dated section, and the fix is an
   * owner writing their own — which is the point of the section.
   */
  journal: {
    heading: {
      label: "From the house",
      title: "Notes from Dahilayan.",
      subtitle: "Newest first",
    },
    items: [
      {
        date: "2026-08-02",
        title: "The mornings have turned",
        text: "The cool has settled in early this year. Mist sits in the valley until about eight, then lifts all at once and the whole ridge comes back. Worth setting an alarm for, which is not something we often say here.",
        images: [
          {
            src: `${UNSPLASH}/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80`,
            alt: "Low cloud sitting between green highland ridges shortly after sunrise",
            caption: "First light over the ridge",
          },
        ],
      },
      {
        date: "2026-07-18",
        title: "A long table kind of weekend",
        text: "A family took the house for four nights and barely left it. Meals ran late, the deck doors stayed open, and nobody looked at a schedule. That is more or less exactly what the place is for.",
        images: [
          {
            src: `${UNSPLASH}/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1200&q=80`,
            alt: "A dining table set for a meal beside open doors onto a timber deck at dusk",
            caption: "The deck, early evening",
          },
          {
            src: `${UNSPLASH}/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1000&q=80`,
            alt: "A pale kitchen island with timber stools and cooking in progress",
            caption: "Somebody always ends up here",
          },
        ],
      },
    ],
  },
  // No shop on this template.
  products: { heading: { label: "", title: "" }, items: [] },
  // The page's one quotation is a brand statement, not a customer's — it lives
  // in `retreat.quote` rather than pretending to be a review.
  testimonials: { heading: { label: "", title: "" }, items: [] },
  faq: { heading: { label: "", title: "" }, items: [] },
  ctaBanner: {
    label: "Your mountain escape awaits",
    titleLines: ["Ready for a slower kind of weekend?"],
    description:
      "Come to Dahilayan, settle in, and make Gloria's yours for a while.",
    primaryCta: { label: "Check Availability", href: "#location", arrow: true },
    callCta: { label: "Message Us", href: "#location", arrow: true },
  },
  contact: {
    label: "Dahilayan, Bukidnon",
    titleLines: ["Close to adventure.", "Far from the noise."],
    intro:
      "Set among the cool highlands of Bukidnon, Dahilayan is known for its mountain scenery, crisp air, outdoor experiences, and easygoing pace. Gloria's gives guests a quiet home base to take it all in on their own schedule.",
    // Replaced at render time by the tenant's own address, hours and phone
    // (lib/website/build-profile.ts). These are the seed's stand-ins.
    details: [
      {
        icon: "📍",
        title: "Location",
        lines: ["Dahilayan, Manolo Fortich", "Bukidnon, Philippines"],
      },
      {
        icon: "🕐",
        title: "Check in",
        lines: ["From 2pm", "Check out by 11am"],
      },
    ],
    // No booking form on this template; enquiries go through the CTA links.
    serviceOptions: [],
    barberOptions: [],
  },
  footer: {
    description: "A quiet escape in the heart of Dahilayan.",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "The Stay", href: "#stay" },
          { label: "Gallery", href: "#gallery" },
          { label: "Experience", href: "#experience" },
          { label: "Location", href: "#location" },
        ],
      },
      {
        title: "Visit",
        links: [
          { label: "Booking", href: "#book" },
          { label: "Getting here", href: "#location" },
        ],
      },
    ],
    copyright: "Gloria's. All rights reserved.",
    credit: "Website by Aliamz Digital",
    // Derived from the tenant's own social columns at render time.
    socials: [],
  },
  floatingCta: { label: "Book Your Stay", href: "#book" },
  retreat: {
    place: { locality: "Dahilayan, Bukidnon", country: "Philippines" },
    introCaption: "The house, Dahilayan",
    stayImage: {
      src: `${UNSPLASH}/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80`,
      alt: "An open living room with soft grey seating and a timber wall, sliding open to the garden",
    },
    imageBreak: {
      titleLines: ["Nothing on the schedule.", "Exactly the point."],
      note: "Stay a little longer.",
      image: `${UNSPLASH}/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=2400&q=80`,
      imageAlt: "A quiet road curving through dense pine forest, seen from above",
    },
    experience: {
      label: "The Experience",
      titleLines: ["Less rush.", "More of what matters."],
      items: [
        {
          title: "Wake Slowly",
          description:
            "Cool mornings, quiet surroundings, and nowhere you need to be.",
        },
        {
          title: "Reconnect",
          description:
            "A private place to share meals, conversations, and uninterrupted time together.",
        },
        {
          title: "Step Outside",
          description:
            "Enjoy the mountain atmosphere and everything Dahilayan has waiting beyond the door.",
        },
      ],
    },
    location: {
      image: `${UNSPLASH}/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1800&q=80`,
      imageAlt:
        "Green highland ridges with low cloud rolling over them at sunrise",
      mapLabel: "Dahilayan, Bukidnon",
      // A map SEARCH, not a pinned place: the seed has no coordinates, and a
      // search for the locality is honest about that where a dropped pin would
      // not be. A tenant replaces it with their own listing.
      mapCta: {
        label: "View Location",
        href: "https://www.google.com/maps/search/?api=1&query=Dahilayan%2C%20Bukidnon%2C%20Philippines",
        arrow: true,
      },
    },
    quote: {
      text: "The best weekends are the ones you wish lasted a little longer.",
      attribution: "Gloria's, Dahilayan",
    },
    bookingImage: `${UNSPLASH}/photo-1511497584788-876760111969?auto=format&fit=crop&w=2400&q=80`,
  },
};
