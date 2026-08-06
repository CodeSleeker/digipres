import type { BusinessProfile } from "@/types/business";

const UNSPLASH = "https://images.unsplash.com";

/**
 * Development seed content for "Desserts by Arah", and the merge base for any
 * tenant on the patisserie/boutique template.
 *
 * Extracted verbatim from templates/patisserie/html/index.html. In production
 * this data comes from the database keyed by the request host; for local dev it
 * is resolved by slug via DEV_BUSINESS_SLUG (see app/page.tsx).
 *
 * The photography is Unsplash placeholder imagery, exactly as the approved
 * mockup ships it — an allow-listed host (lib/images/safe-src.ts), so it goes
 * through the image optimizer and a tenant's own uploads replace it in place.
 */
export const arah: BusinessProfile = {
  slug: "arah",
  brand: {
    namePrimary: "Desserts by",
    nameAccent: "Arah",
    initial: "A",
    logoUrl: null,
    wordmarkUrl: null,
  },
  seo: {
    title: "Desserts by Arah | Boutique Cakes, Pastries & Custom Orders",
    description:
      "A boutique pastry kitchen in Cagayan de Oro making small batch cakes, tarts and tea time favourites to order, plus hand finished custom cakes for weddings and celebrations.",
  },
  nav: [
    { label: "Desserts", href: "#featured" },
    { label: "Custom Cakes", href: "#custom" },
    { label: "Gallery", href: "#gallery" },
    { label: "About", href: "#about" },
    // Filtered out by build-profile for tenants with no FAQ items.
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ],
  navCta: { label: "Order now", href: "#featured", arrow: true },
  hero: {
    overline: "Small batch, baked to order",
    titleLines: [
      { text: "Desserts worth" },
      // `stroke` is the barber template's gold outline; here the flag drives the
      // Playfair italic, which is this design's equivalent emphasis. One line
      // per entry, so the emphasis covers the whole closing clause.
      { text: "slowing down for.", stroke: true },
    ],
    description:
      "A boutique pastry kitchen in Cagayan de Oro making cakes, tarts and tea time favourites to order. Everything leaves the studio the morning it reaches you, in batches small enough to keep every detail right.",
    primaryCta: { label: "Browse the menu", href: "#featured", arrow: true },
    secondaryCta: { label: "Book a custom cake", href: "#custom" },
    // Rendered by the barber hero; the patisserie hero carries its proof strip
    // instead, so this stays empty rather than inventing figures.
    stats: [],
    image: `${UNSPLASH}/photo-1568827999250-3f6afff96e66?auto=format&fit=crop&w=1100&h=1375&q=80`,
    imageAlt:
      "A naked celebration cake topped with fresh strawberries and chamomile flowers",
    badge: "Taking orders for this week",
    proof: {
      avatars: [
        `${UNSPLASH}/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=70`,
        `${UNSPLASH}/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=70`,
        `${UNSPLASH}/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=70`,
        `${UNSPLASH}/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=70`,
      ],
      rating: 5,
      highlight: "4.9 average",
      text: "from 380 reviews across Google and Facebook.",
    },
    card: {
      image: `${UNSPLASH}/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=140&h=140&q=70`,
      title: "Custom cake slots",
      subtitle: "Next opening: 19 August",
      progress: 70,
      note: "7 of 10 August slots booked",
    },
  },
  marquee: [
    "Baked fresh daily",
    "No preservatives",
    "Islandwide delivery",
    "Wedding & events",
    "Corporate gifting",
  ],
  services: {
    heading: {
      label: "The current menu",
      title: "Made in the morning, finished by hand",
      subtitle:
        "A short menu, changed with the season. Every cake is built from butter, real fruit and single origin chocolate, then finished by hand the day it goes out the door.",
      link: { label: "See the full menu", href: "#contact", arrow: true },
    },
    items: [
      {
        icon: "",
        tag: "Signature",
        title: "Pistachio Rose Cake",
        description:
          "Almond and pistachio sponge, rose infused cream, candied pistachio praline on top.",
        price: "₱2,450",
        unit: "whole",
        meta: "Serves 12–14",
        image: `${UNSPLASH}/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=760&h=640&q=80`,
        imageAlt:
          "A slice of pistachio and berry layer cake plated on dark ceramic",
      },
      {
        icon: "",
        tag: "Bestseller",
        title: "Salted Dark Chocolate Tart",
        description:
          "Sixty eight percent couverture ganache in a cocoa shortcrust, finished with sea salt.",
        price: "₱1,180",
        unit: "whole",
        meta: "Serves 8",
        image: `${UNSPLASH}/photo-1626803775151-61d756612f97?auto=format&fit=crop&w=760&h=640&q=80`,
        imageAlt:
          "Dark chocolate tart with a glossy ganache surface, finished with pistachio and sea salt",
      },
      {
        icon: "",
        tag: "Seasonal",
        title: "Calamansi Meringue Tart",
        description:
          "Torched Italian meringue over sharp calamansi curd, set in a butter pastry shell.",
        price: "₱1,350",
        unit: "whole",
        meta: "Serves 10",
        image: `${UNSPLASH}/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=760&h=640&q=80`,
        imageAlt: "Citrus tart topped with deep swirls of torched meringue",
      },
    ],
  },
  about: {
    label: "The person behind it",
    titleLines: ["A two burner kitchen,", "and a long list"],
    text: "Arah started baking in 2016 from a rented apartment with one oven that ran hot on the left side. The first orders were for friends, then for their offices, then for weddings she had no business saying yes to.",
    paragraphs: [
      "Nine years on, the studio is small on purpose. We cap the diary at fourteen custom cakes a week so that every one gets the same attention the first ones did. Butter is real, fruit is bought at the market that morning, and nothing leaves without Arah looking at it first.",
      "If you have an idea you are not sure is possible, bring it anyway. Most of our favourite cakes started that way.",
    ],
    // The barber template's checklist; this design carries figures instead.
    features: [],
    cta: { label: "Talk to us", href: "#contact", arrow: true },
    image: `${UNSPLASH}/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&h=1035&q=80`,
    imageAlt:
      "Small cakes topped with cream and fresh strawberries, cooling on the studio bench",
    badgeValue: "2016",
    badgeLabel: "Baking since",
    stats: [
      { value: "3,400+", label: "Cakes delivered" },
      { value: "14", label: "Custom cakes a week, capped" },
      { value: "4.9", label: "Average review score" },
    ],
    signature: { name: "Arah", role: "Founder and head pastry chef" },
  },
  /**
   * The team section, which this template does not render — "barbers" is absent
   * from its `sections` in templates/registry.ts, so the CMS never offers it
   * either. Empty rather than removed because the field is required by the
   * shared profile contract.
   */
  barbers: {
    heading: { label: "", title: "" },
    items: [],
  },
  gallery: {
    heading: {
      label: "From the studio",
      title: "Recent work",
      subtitle:
        "A few cakes and boxes that left the kitchen this season. Tap any photo to see it larger.",
      link: {
        label: "Follow on Instagram",
        href: "https://instagram.com",
        arrow: true,
      },
    },
    /**
     * `width`/`height` are the crop each URL asks Unsplash for, which is what
     * the browser receives — so they are the picture's real proportions, and
     * the masonry lays out from them rather than inventing a shape. The CMS
     * measures these itself when an owner adds a photograph.
     */
    items: [
      {
        title: "The morning bake, still warm",
        by: "",
        image: `${UNSPLASH}/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=700&h=900&q=80`,
        alt: "Trays of freshly baked pastries lined up in the studio",
        width: 700,
        height: 900,
      },
      {
        title: "Chocolate drip, poured warm",
        by: "",
        image: `${UNSPLASH}/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&h=700&q=80`,
        alt: "Chocolate layer cake with piped rosettes and a poured ganache drip",
        width: 700,
        height: 700,
      },
      {
        title: "Strawberry fraisier, built in layers",
        by: "",
        image: `${UNSPLASH}/photo-1611293388250-580b08c4a145?auto=format&fit=crop&w=700&h=1000&q=80`,
        alt: "Strawberry fraisier cake with halved berries set around the edge",
        width: 700,
        height: 1000,
      },
      {
        title: "Meringue, torched to order",
        by: "",
        image: `${UNSPLASH}/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=700&h=780&q=80`,
        alt: "Citrus tart with a thick swirled meringue top, one slice cut away",
        width: 700,
        height: 780,
      },
      {
        title: "Panna cotta, set overnight",
        by: "",
        image: `${UNSPLASH}/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=700&h=700&q=80`,
        alt: "Small jars of panna cotta topped with chopped strawberries",
        width: 700,
        height: 700,
      },
      {
        title: "A birthday order, ready for its box",
        by: "",
        image: `${UNSPLASH}/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=700&h=880&q=80`,
        alt: "Pink drip birthday cake decorated with sprinkles and cones",
        width: 700,
        height: 880,
      },
      {
        title: "Cookies, boxed by the dozen",
        by: "",
        image: `${UNSPLASH}/photo-1464195244916-405fa0a82545?auto=format&fit=crop&w=700&h=700&q=80`,
        alt: "Chocolate chip cookies piled in a wooden bowl with a linen cloth",
        width: 700,
        height: 700,
      },
      {
        title: "Glazed rings, dipped twice",
        by: "",
        image: `${UNSPLASH}/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=700&h=950&q=80`,
        alt: "Pale glazed doughnuts stacked on a white plate",
        width: 700,
        height: 950,
      },
    ],
  },
  products: {
    heading: {
      label: "Ordered again and again",
      title: "Best sellers",
      subtitle:
        "The ones regulars message us about on a Monday morning. Boxed for pickup, or delivered chilled across the city.",
    },
    items: [
      {
        icon: "",
        name: "Vanilla Bean Cheesecake",
        description: "Baked vanilla cheesecake spooned with raspberry compote.",
        meta: "Whole, 7 inch",
        price: "₱1,280",
        image: `${UNSPLASH}/photo-1578775887804-699de7086ff9?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt:
          "Slice of baked vanilla cheesecake spooned with raspberry compote",
      },
      {
        icon: "",
        name: "Butter Croissants",
        description: "Laminated over three days, baked to order each morning.",
        meta: "Box of 6",
        price: "₱420",
        image: `${UNSPLASH}/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt: "Golden butter croissants dusted with icing sugar",
      },
      {
        icon: "",
        name: "Brown Butter Cookies",
        description: "Browned butter, dark chocolate, finished with sea salt.",
        meta: "Box of 12",
        price: "₱480",
        image: `${UNSPLASH}/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt: "Chocolate chip cookies gathered in a lined basket",
      },
      {
        icon: "",
        name: "Morning Pastry Box",
        description: "Whatever came out of the oven best that morning.",
        meta: "Box of 6, baker's choice",
        price: "₱390",
        image: `${UNSPLASH}/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt: "Trays of freshly baked pastries lined up in the studio",
      },
      {
        icon: "",
        name: "Passionfruit Macarons",
        description: "Sharp passionfruit ganache between almond shells.",
        meta: "Box of 12",
        price: "₱620",
        image: `${UNSPLASH}/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt: "A plate of pastel macarons finished with citrus zest",
      },
      {
        icon: "",
        name: "Tiramisu Slice",
        description: "Espresso soaked sponge, mascarpone cream, cocoa on top.",
        meta: "Single portion",
        price: "₱260",
        image: `${UNSPLASH}/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=560&h=560&q=80`,
        imageAlt: "Layered tiramisu slices dusted with cocoa",
      },
    ],
  },
  testimonials: {
    heading: {
      label: "Kind words",
      title: "What people say after the last slice",
    },
    items: [
      {
        rating: 5,
        text: "We sent Arah one blurry photo of my grandmother's wedding cake from 1968. What arrived was better than the memory. Half our guests asked where it came from before dessert was even served.",
        author: "Mariel & JP",
        meta: "Wedding, Seda Centrio",
        initials: "MJ",
      },
      {
        rating: 5,
        text: "I have ordered every birthday for four years running. The vanilla bean cheesecake is the only cake my father asks for by name, and it has never once arrived late.",
        author: "Trina Dagondon",
        meta: "Regular since 2021",
        initials: "TD",
      },
      {
        rating: 5,
        text: "Sixty gift boxes, delivered to three offices, all before nine in the morning. The packaging alone made our clients take photos. Genuinely the easiest supplier we work with.",
        author: "Kaye Alcantara",
        meta: "Corporate gifting, Northmin Group",
        initials: "KA",
      },
    ],
  },
  faq: {
    heading: { label: "Good to know", title: "Frequently asked" },
    items: [
      {
        question: "How far in advance should I order?",
        answer:
          "Menu items need two days. Custom cakes need ten days, and wedding tiers need four weeks. We do keep a small number of rush slots each week, so it is always worth asking.",
      },
      {
        question: "Do you deliver, and where?",
        answer:
          "We deliver across Cagayan de Oro and to Opol, Tagoloan and El Salvador. Wedding cakes are delivered and assembled on site anywhere in Northern Mindanao. Pickup from the studio in Carmen is always free.",
      },
      {
        question: "Can you work around allergies or dietary needs?",
        answer:
          "Yes for eggless, dairy free and reduced sugar, with a week of notice. Please note the kitchen handles nuts, wheat, egg and dairy daily, so we cannot promise a fully allergen free environment.",
      },
      {
        question: "What does a custom cake cost?",
        answer:
          "Custom work starts at ₱2,800 for a single tier serving twenty, and most wedding cakes land between ₱9,000 and ₱22,000 depending on tiers, sugar work and flowers. You get a fixed quote before anything is confirmed.",
      },
      {
        question: "Is there a tasting before I book?",
        answer:
          "Every wedding enquiry includes a tasting box of four flavours, delivered to you. The box is ₱750, and it is credited back in full when you confirm the booking.",
      },
      {
        question: "How should I store the cake once it arrives?",
        answer:
          "Keep it chilled and boxed, then bring it out about forty minutes before serving. Buttercream is at its best just below room temperature. Cakes hold well for three days, though they rarely last that long.",
      },
    ],
  },
  // Rendered by the barber template only; this design ends on the contact card.
  ctaBanner: {
    label: "",
    titleLines: [],
    description: "",
    primaryCta: { label: "", href: "#contact" },
    callCta: { label: "", href: "#contact" },
  },
  contact: {
    label: "Get in touch",
    titleLines: ["Let's plan", "something sweet"],
    intro:
      "Tell us what you need and when you need it. We reply to every enquiry within one business day.",
    details: [
      {
        icon: "📍",
        title: "Studio",
        lines: ["24 Vamenta Boulevard, Carmen", "Cagayan de Oro, 9000"],
      },
      {
        icon: "🕐",
        title: "Pickup hours",
        lines: [
          "Tuesday to Saturday, 9am to 6pm",
          "Sunday, 10am to 3pm. Closed Mondays.",
        ],
      },
      { icon: "📱", title: "Call or Viber", lines: ["+63 917 000 0000"] },
      { icon: "✉", title: "Email", lines: ["hello@dessertsbyarah.ph"] },
    ],
    // "What is it for?" on the enquiry form.
    serviceOptions: [
      { label: "Menu order" },
      { label: "Custom cake" },
      { label: "Wedding" },
      { label: "Corporate gifting" },
      { label: "Something else" },
    ],
    // No per-staff routing on this template.
    barberOptions: [],
  },
  footer: {
    description:
      "A small pastry studio in Cagayan de Oro, baking to order since 2016.",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "Desserts", href: "#featured" },
          { label: "Best sellers", href: "#bestsellers" },
          { label: "Custom cakes", href: "#custom" },
          { label: "Gallery", href: "#gallery" },
          { label: "About", href: "#about" },
        ],
      },
      {
        title: "Orders",
        links: [
          { label: "Place an order", href: "#contact" },
          { label: "Book a consultation", href: "#custom" },
          { label: "Delivery areas", href: "#faq" },
          { label: "Lead times", href: "#faq" },
          { label: "Corporate gifting", href: "#contact" },
        ],
      },
    ],
    copyright: "Desserts by Arah. Baked by hand in Cagayan de Oro.",
    credit: "",
    // Derived from the tenant's own social columns at render time.
    socials: [],
  },
  floatingCta: { label: "Order now", href: "#contact" },
  patisserie: {
    customCakes: {
      label: "Custom cakes",
      titleLines: ["For the days you", "will remember"],
      intro:
        "Weddings, christenings, milestone birthdays and the quiet anniversaries in between. We start with the story of the day, then design a cake that belongs to it, down to the shade of the buttercream.",
      steps: [
        {
          title: "Tell us about the day",
          description:
            "Share the date, the guest count and a few images you love. A short form is enough to start.",
        },
        {
          title: "Design and tasting",
          description:
            "We sketch two directions and send a tasting box of four flavours to your address.",
        },
        {
          title: "Baked and finished by hand",
          description:
            "Your cake is built over two days, iced and decorated the morning of the event.",
        },
        {
          title: "Delivered and set up",
          description:
            "We deliver chilled, assemble on site and stay until the table is exactly right.",
        },
      ],
      images: [
        {
          src: `${UNSPLASH}/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=900&h=1080&q=80`,
          alt: "A tiered white celebration cake dressed with fresh berries and warm string lights",
        },
        {
          src: `${UNSPLASH}/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=560&h=560&q=80`,
          alt: "Close detail of a mirror glazed cake finished with a fresh strawberry",
        },
      ],
      tag: "Booked 2–4 weeks ahead",
      occasionOptions: [
        { label: "Wedding" },
        { label: "Birthday" },
        { label: "Christening" },
        { label: "Corporate" },
        { label: "Something else" },
      ],
      submitLabel: "Start the enquiry",
      note: "Custom orders need 10 days notice. Wedding tiers, 4 weeks.",
    },
    faqAside: {
      title: "Still deciding?",
      text: "Message us on Viber or Instagram and you will usually hear back within the hour, between 8am and 6pm.",
      cta: { label: "Talk to us", href: "#contact", arrow: true },
    },
    railNote:
      "Same day pickup on orders placed before 10am. Delivery slots open daily at 1pm.",
    footerNote: {
      title: "The Sunday list",
      text: "One email a week: what is coming out of the oven, and what is nearly gone. Ask us to add you when you order.",
      cta: { label: "Ask to be added", href: "#contact", arrow: true },
    },
  },
};
