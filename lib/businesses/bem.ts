import type { BusinessProfile } from "@/types/business";

const UNSPLASH = "https://images.unsplash.com";

/**
 * Development seed content for "Elegance by Bem", and the merge base for any
 * tenant on the events/elegance template.
 *
 * Extracted from templates/events/html/index.html — the approved design — and
 * adapted only where the brief named different categories (the services and
 * the portfolio filters). In production this data comes from the database
 * keyed by the request host; locally it resolves by slug via
 * DEV_BUSINESS_SLUG.
 *
 * The photography is the Unsplash imagery the approved mockup ships, on an
 * allow-listed host (lib/images/safe-src.ts), so it goes through the image
 * optimizer and a tenant's own uploads replace it in place.
 *
 * PLACEHOLDERS TO REPLACE BEFORE LAUNCH, all marked TODO(bem) below: the phone
 * number, the two social profiles and the Messenger link. The mockup shipped
 * dead `#` links for all of them; these are shaped correctly so the markup is
 * right, but none has been confirmed with the client.
 *
 * THE PHOTOGRAPHS DO NOT MATCH THEIR CAPTIONS, and that is inherited from the
 * approved mockup rather than chosen here: its Unsplash ids were picked for
 * mood and never checked against the events they sit under. One stock headshot
 * of a man serves BOTH the founder's portrait and the "De Leon Golden
 * Anniversary" card; "Maxine's Wonderland Party", a children's birthday, is a
 * night-time concert crowd; the black-tie gala is a rustic banquet with
 * sunflowers. Replacing these with the studio's own photography is the fix.
 *
 * The `alt` strings below describe WHAT EACH PHOTOGRAPH ACTUALLY SHOWS, which
 * is why several read oddly against the caption beside them. They previously
 * described the scene the caption implied — invented, because nobody had
 * looked at the images. Alt text that narrates an imaginary photograph is
 * worse than none: it tells a screen-reader user something that is not on the
 * page. When the real photographs land, every one of these has to be rewritten
 * with them.
 */
export const bem: BusinessProfile = {
  slug: "bem",
  brand: {
    // The wordmark the mockup sets: "Elegance" in gold, "by Bem" beside it in
    // a lighter weight. No logo file exists for this client, so both image
    // slots stay null and the lockup renders as type — which is what the
    // approved design does.
    namePrimary: "Elegance",
    nameAccent: "by Bem",
    initial: "B",
    logoUrl: null,
    wordmarkUrl: null,
  },
  seo: {
    title: "Elegance by Bem | Event Styling, Design & Coordination",
    description:
      "Event styling, design and coordination for weddings, debuts, birthdays, anniversaries, intimate celebrations and corporate events. Every celebration planned down to the last detail.",
  },
  nav: [
    { label: "Portfolio", href: "#portfolio" },
    { label: "Events", href: "#events" },
    { label: "Services", href: "#services" },
    { label: "Our Story", href: "#story" },
  ],
  navCta: { label: "Book Consultation", href: "#inquiry" },
  hero: {
    overline: "Event Styling & Design",
    titleLines: [
      { text: "Creating" },
      // `stroke` is the shared flag for "set this line apart". The barber
      // outlines it in gold; here it is the gold semibold italic line the
      // mockup centres the headline on.
      { text: "Unforgettable", stroke: true },
      { text: "Moments" },
    ],
    description:
      "Styling, design and coordination for weddings, debuts, birthdays and celebrations of every size — planned with care and finished down to the last detail.",
    primaryCta: { label: "View Portfolio", href: "#portfolio" },
    secondaryCta: { label: "Our Story", href: "#story" },
    // The events hero carries no figures row; the approach panel holds them.
    stats: [],
    image: `${UNSPLASH}/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1920&q=80`,
    imageAlt:
      "White daisies in a green vase beside a champagne bottle, candles and cupcakes, against a whitewashed brick wall",
    badge: "Now Booking",
    card: {
      image: `${UNSPLASH}/photo-1478146059778-26028b07395a?auto=format&fit=crop&w=800&h=1067&q=80`,
      title: "Season 2026",
      subtitle: "Consultations open",
      progress: 60,
      note: "A limited number of dates each month.",
    },
  },
  marquee: [],
  services: {
    heading: { label: "What We Do", title: "Our Services" },
    items: [
      {
        icon: "heart",
        title: "Weddings",
        description:
          "Full styling from ceremony to reception, designed around your story — florals, tablescapes, lighting and the run of the day.",
        // No prices anywhere on this template: an event is quoted after a
        // conversation, so `itemPricing` is not declared and these stay blank
        // rather than carrying a figure nothing prints.
        price: "",
        unit: "",
      },
      {
        icon: "sparkles",
        title: "Birthdays & Debuts",
        description:
          "Debuts, milestone birthdays and children's parties, styled so the room feels like the person it is for.",
        price: "",
        unit: "",
      },
      {
        icon: "crown",
        title: "Corporate & Special Events",
        description:
          "Launches, galas, anniversaries and private gatherings — composed, considered and run to the minute.",
        price: "",
        unit: "",
      },
      {
        icon: "palette",
        title: "Event Styling",
        description:
          "Concept, florals, décor and installation for a celebration you are planning yourself, or one another team is running.",
        price: "",
        unit: "",
      },
    ],
  },
  about: {
    label: "The Philosophy",
    // Joined with a newline by the story section, so the second line is the
    // gold italic clause the mockup sets.
    titleLines: ["Born from a passion for", "extraordinary moments"],
    text: "Elegance by Bem was founded on a single belief: that every celebration deserves to be a masterpiece. We turn rooms into living works of art — immersive, emotional and completely unforgettable.",
    paragraphs: [
      "We do not follow trends, we set them. Our designs blend timeless sophistication with modern luxury, and every flower, every light and every texture is placed with purpose. Your vision becomes our obsession.",
    ],
    // The checklist and the button belong to other templates' story sections;
    // this one renders neither, so they stay empty rather than carrying copy
    // nothing draws.
    features: [],
    cta: { label: "", href: "" },
    image: `${UNSPLASH}/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80`,
    imageAlt: "A man in a white t-shirt smiling at the camera",
    badgeValue: "Award Winning",
    badgeLabel: "Best Event Stylist '25",
    signature: { name: "Bem", role: "Founder & Lead Event Designer" },
  },
  // Sections this template does not render. Kept empty rather than filled:
  // the CMS is told which sections exist (templates/registry.ts), and content
  // written into a section the site never draws is content an owner would
  // never see again.
  barbers: { heading: { label: "", title: "" }, items: [] },
  gallery: { heading: { label: "", title: "" }, items: [] },
  products: { heading: { label: "", title: "" }, items: [] },
  testimonials: {
    heading: { label: "Love Letters", title: "Our\nHappy Clients" },
    items: [
      {
        rating: 5,
        text: "Our wedding was an absolute dream. Bem transformed the venue into something out of a fairytale. Every guest was speechless. Pure magic.",
        author: "Amara & David",
        meta: "Wedding, March 2026",
        initials: "A",
      },
      {
        rating: 5,
        text: "My daughter's debut was beyond anything we imagined. The florals, the lighting, the details — Elegance by Bem made her feel like a princess.",
        author: "Sofia Reyes",
        meta: "Debut Celebration",
        initials: "S",
      },
      {
        rating: 5,
        text: "We hired Bem for our 50th anniversary gala and it was perfection. The gold and ivory palette, the cascading florals — an evening we will cherish forever.",
        author: "Victoria & James",
        meta: "Anniversary Gala",
        initials: "V",
      },
    ],
  },
  // The approved design has no questions block. Empty `items` renders nothing
  // and keeps the shape a CMS can fill later.
  faq: { heading: { label: "", title: "" }, items: [] },
  ctaBanner: {
    label: "Let's Create Together",
    // Asterisks mark the shimmering gold phrase inside the line — see
    // HeadlineLine in the inquiry section.
    titleLines: ["Ready to bring your", "*dream event* to life?"],
    description:
      "Tell us about your celebration and we will come back to you with ideas, availability and what it would take. The first conversation is free.",
    primaryCta: { label: "Schedule Consultation", href: "#inquiry" },
    callCta: { label: "Call us", href: "#inquiry" },
  },
  contact: {
    label: "Get In Touch",
    titleLines: ["Let's plan", "something beautiful"],
    intro:
      "Send an enquiry and we will reply within one working day, usually sooner.",
    /*
     * `icon` is the emoji the shared contract uses — the barber template
     * prints it, and this one keys its line art off it (see DetailIcon). Same
     * glyphs `buildContactDetails` derives for a real tenant.
     */
    details: [
      {
        icon: "📍",
        title: "Studio",
        lines: ["Cagayan de Oro,", "Philippines, 9000"],
      },
      {
        icon: "🕐",
        title: "Hours",
        lines: ["Mon–Sat: 9AM – 6PM"],
      },
      {
        icon: "✉",
        title: "Email",
        // TODO(bem): confirm the live address before launch.
        lines: ["hello@elegancebybem.com"],
      },
      {
        icon: "📱",
        title: "Phone",
        // TODO(bem): placeholder. The mockup shipped +1 (555) 123-4567; this
        // is the same placeholder in the right format, and it is what the
        // closing banner dials.
        lines: ["+63 917 555 0142"],
      },
    ],
    // The enquiry form's dropdowns come from `events.inquiry`, not from these
    // — which is why the template does not declare `bookingOptions` and the
    // CMS never asks for them twice.
    serviceOptions: [],
    barberOptions: [],
  },
  footer: {
    description:
      "Event styling, design and coordination for weddings, debuts, birthdays and exclusive celebrations. Every event, a masterpiece.",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "Portfolio", href: "#portfolio" },
          { label: "Latest Events", href: "#events" },
          { label: "Services", href: "#services" },
          { label: "Our Story", href: "#story" },
          { label: "Client Love", href: "#testimonials" },
          { label: "Book Consultation", href: "#inquiry" },
        ],
      },
    ],
    copyright: "Elegance by Bem. All rights reserved.",
    credit: "Crafted by AliAmz Digital",
    socials: [
      // TODO(bem): confirm both handles. The mockup shipped four dead `#`
      // links; these are the two the studio actually posts to.
      {
        label: "instagram",
        href: "https://www.instagram.com/elegancebybem",
        ariaLabel: "Elegance by Bem on Instagram",
      },
      {
        label: "facebook",
        href: "https://www.facebook.com/elegancebybem",
        ariaLabel: "Elegance by Bem on Facebook",
      },
    ],
  },
  floatingCta: { label: "Enquire", href: "#inquiry" },
  events: {
    portfolio: {
      heading: { label: "Our Signature Events", title: "Featured Portfolio" },
      items: [
        {
          label: "Weddings",
          title: "Grand Celebrations",
          description:
            "Wedding designs from intimate ceremonies to full receptions, styled around the two people at the centre of them.",
          image: `${UNSPLASH}/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&h=800&q=80`,
          alt: "A bride and groom holding hands, her lace sleeve against his dark suit",
          // Narrows the grid below on the way past. Must match a category
          // used by a showcase item, or the click scrolls without filtering.
          filter: "Weddings",
        },
        {
          label: "Birthdays & Debuts",
          title: "Milestone Moments",
          description:
            "Debut and birthday styling for the moments a family remembers for the rest of their lives.",
          image: `${UNSPLASH}/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&h=800&q=80`,
          alt: "A canopy of brightly coloured balloons filling the ceiling",
          filter: "Birthdays",
        },
        {
          label: "Corporate & Galas",
          title: "Luxury Gatherings",
          description:
            "Event design for galas, launches and private company celebrations that have to look effortless.",
          image: `${UNSPLASH}/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&h=800&q=80`,
          alt: "Banquet tables with white chair covers and sunflowers in burlap-wrapped jars",
          filter: "Corporate",
        },
      ],
    },
    showcase: {
      heading: {
        label: "Recently Styled",
        title: "Latest Events",
        subtitle:
          "A glimpse into our most recent celebrations — each one designed around what the client came to us wanting.",
      },
      allLabel: "All",
      /*
       * The filter chips are DERIVED from these categories, in the order they
       * first appear — so this list is what the reader can filter by, and the
       * two can never disagree. The brief's six chips (All, Weddings,
       * Birthdays, Debuts, Corporate, Other Events) are exactly what the rows
       * below produce.
       */
      items: [
        {
          category: "Weddings",
          title: "Castillo–Rivera Grand Wedding",
          venue: "The Peninsula Manila",
          date: "June 14, 2026",
          description:
            "A garden ceremony with cascading ivory roses, gold candelabras, and 300 guests under a canopy of fairy lights.",
          image: `${UNSPLASH}/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "A bride holding a bouquet of pale roses, backlit against a dark background",
        },
        {
          category: "Debuts",
          title: "Isabelle's Enchanted Debut",
          venue: "Shangri-La Ballroom",
          date: "May 22, 2026",
          description:
            "A whimsical enchanted-garden theme with blush peonies, crystal chandeliers, and an ethereal fog-lit dance floor.",
          image: `${UNSPLASH}/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "A canopy of brightly coloured balloons filling the ceiling",
        },
        {
          category: "Corporate",
          title: "Santos Group Annual Gala",
          venue: "Grand Hyatt, BGC",
          date: "April 30, 2026",
          description:
            "A black-tie celebration with dramatic gold draping, geometric installations, and a live jazz ensemble.",
          image: `${UNSPLASH}/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "Banquet tables with white chair covers and sunflowers in burlap-wrapped jars",
        },
        {
          category: "Other Events",
          title: "De Leon Golden Anniversary",
          venue: "Solaire Resort",
          date: "March 18, 2026",
          description:
            "A golden 50th anniversary dinner with heritage tablescapes, monogrammed linens, and an intimate 80-person gathering.",
          image: `${UNSPLASH}/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "A man in a white t-shirt smiling at the camera",
        },
        {
          category: "Weddings",
          title: "Reyes–Tan Sunset Ceremony",
          venue: "Balesin Island Club",
          date: "February 8, 2026",
          description:
            "A beachfront sunset wedding with flowing white drapery, tropical blooms, and barefoot elegance for 150 guests.",
          image: `${UNSPLASH}/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "A ballroom of round tables and gold chiavari chairs under lit chandeliers",
        },
        {
          category: "Birthdays",
          title: "Maxine's Wonderland Party",
          venue: "Ayala Alabang Village",
          date: "January 12, 2026",
          description:
            "A pastel wonderland birthday with balloon sculptures, custom dessert displays, and play zones for the little guests.",
          image: `${UNSPLASH}/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&h=450&q=80`,
          alt: "A crowd at a night-time concert under stage lights and falling confetti",
        },
      ],
      /*
       * NO BUTTON. The mockup had a "View All Events" one pointing at `#`,
       * and pointing it at the enquiry form was worse than leaving it dead:
       * a button promising more work, that scrolls you to a contact form.
       *
       * The grid already shows every event and the "All" chip restores the
       * unfiltered view, so there is nothing for it to do until there is
       * somewhere real to send people. Set `cta` to the studio's Instagram or
       * a gallery page and it renders again — an off-site link opens in a new
       * tab (see the Showcase section).
       */
    },
    /*
     * The mockup's "Our Approach" panel, carrying the brief's "how it works".
     *
     * The approved design has no separate process strip, and adding one would
     * have meant inventing a section rather than converting the template. The
     * three steps are told here instead, beside the photograph and above the
     * figures that back them up — which is where a reader already looks for
     * "so how does this work".
     */
    approach: {
      label: "How It Works",
      titleLines: ["Every detail tells a story of", "intention and beauty"],
      text: "It starts with a conversation about the day you have in mind, the room and the budget. We come back with a concept — palette, florals, lighting, layout — and refine it with you until it is right. On the day, we install, style and stay until the last detail is in place, so you can be a guest at your own celebration.",
      image: `${UNSPLASH}/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&h=600&q=80`,
      imageAlt:
        "A long dining table set with glassware and a bright floral centrepiece",
      stats: [
        { value: "500+", label: "Events Styled" },
        { value: "12+", label: "Years of Artistry" },
        { value: "100%", label: "Bespoke Design" },
      ],
    },
    footerLegal: [{ label: "Privacy Policy", href: "/privacy" }],
    inquiry: {
      title: "Tell us about your\ncelebration",
      intro:
        "The more you can tell us, the more useful our first reply will be. Nothing here is fixed — it is a starting point for the conversation.",
      eventTypes: [
        { label: "Wedding" },
        { label: "Debut" },
        { label: "Birthday" },
        { label: "Anniversary" },
        { label: "Corporate event" },
        { label: "Intimate celebration" },
        { label: "Something else" },
      ],
      budgetRanges: [
        { label: "Under ₱100,000" },
        { label: "₱100,000 – ₱250,000" },
        { label: "₱250,000 – ₱500,000" },
        { label: "₱500,000 – ₱1,000,000" },
        { label: "Over ₱1,000,000" },
        { label: "Still working it out" },
      ],
      serviceNeeds: [
        { label: "Full event styling" },
        { label: "Florals and décor" },
        { label: "Coordination on the day" },
        { label: "Venue sourcing" },
        { label: "Lighting and installations" },
        { label: "Not sure yet" },
      ],
      successTitle: "Your enquiry is with us",
      successText:
        "We will reply within one working day with ideas and availability. Keep the reference below — quote it and we will pick up exactly where you left off.",
      // TODO(bem): point this at the studio's real Messenger page. Frontend
      // only: it opens a chat, it does not carry the enquiry with it. When the
      // intake lands, submitInquiry sends the enquiry and this stays a link.
      messengerCta: {
        label: "Continue on Messenger",
        href: "https://m.me/elegancebybem",
      },
      /*
       * The consultation half. Present, so the section offers both: a
       * consultation has a day and a time and becomes a real appointment,
       * while an enquiry has neither and stays a question. Clearing the title
       * in the CMS removes the switch and leaves a pure enquiry form.
       */
      consultation: {
        enquiryLabel: "About an event",
        bookingLabel: "Book a consultation",
        title: "Let's find a\ntime to talk",
        intro:
          "Pick a day and a time that suit you. We will confirm before anything is booked in, and the first conversation is free.",
        topics: [
          { label: "Wedding" },
          { label: "Debut" },
          { label: "Birthday" },
          { label: "Corporate event" },
          { label: "Something else" },
        ],
        successTitle: "Your slot is requested",
        successText:
          "We have it, and we will come back to you shortly to confirm the time. You will get a text and an email either way.",
      },
    },
  },
};
