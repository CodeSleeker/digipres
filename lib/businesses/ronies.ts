import type { BusinessProfile } from "@/types/business";

/**
 * Development seed content for "Ronie's Barber Shop".
 *
 * Extracted verbatim from templates/barber/html/mockup.html. In production this
 * data will come from the database keyed by the request host; for local dev it
 * is resolved by slug via DEV_BUSINESS_SLUG (see app/page.tsx).
 */
export const ronies: BusinessProfile = {
  slug: "ronies",
  brand: {
    namePrimary: "RONIE'S",
    nameAccent: "BARBER",
    initial: "R",
  },
  seo: {
    title: "Ronie's Barber Shop — Premium Men's Grooming | Cagayan de Oro",
    description:
      "Premium men's grooming experience in the heart of Cagayan de Oro. Precision cuts, sharp fades, and classic barbering — elevated.",
  },
  nav: [
    { label: "Services", href: "#services" },
    { label: "About", href: "#about" },
    { label: "Barbers", href: "#barbers" },
    { label: "Gallery", href: "#gallery" },
    { label: "Reviews", href: "#testimonials" },
    { label: "Contact", href: "#contact" },
  ],
  navCta: { label: "BOOK NOW", href: "#contact" },
  hero: {
    overline: "EST. CAGAYAN DE ORO",
    titleLines: [
      { text: "WHERE" },
      { text: "STYLE", stroke: true },
      { text: "MEETS CRAFT" },
    ],
    description:
      "Premium men's grooming experience in the heart of Cagayan de Oro. Precision cuts, sharp fades, and classic barbering — elevated.",
    primaryCta: { label: "BOOK APPOINTMENT", href: "#contact", arrow: true },
    secondaryCta: { label: "VIEW SERVICES", href: "#services" },
    stats: [
      { value: "10+", label: "Years Experience" },
      { value: "5K+", label: "Happy Clients" },
      { value: "4.9", label: "Google Rating" },
    ],
    backgroundImage:
      "https://images.unsplash.com/photo-1585747860019-8084de357de0?w=1920&q=80",
  },
  marquee: [
    "PRECISION CUTS",
    "CLASSIC FADES",
    "HOT TOWEL SHAVES",
    "BEARD GROOMING",
    "PREMIUM PRODUCTS",
    "HAIR STYLING",
    "SCALP TREATMENT",
  ],
  services: {
    heading: {
      label: "What We Offer",
      title: "OUR SERVICES",
      subtitle: "Crafted with precision, delivered with style",
    },
    items: [
      {
        icon: "✂",
        title: "SIGNATURE HAIRCUT",
        description:
          "Precision haircut tailored to your face shape and lifestyle. Includes consultation, cut, wash, and styling.",
        price: "₱250",
        unit: "/ session",
      },
      {
        icon: "◐",
        title: "SKIN FADE",
        description:
          "Seamless gradient from skin to length. Our barbers specialize in low, mid, and high skin fades.",
        price: "₱300",
        unit: "/ session",
      },
      {
        icon: "♦",
        title: "BEARD SCULPTING",
        description:
          "Expert beard trimming, shaping, and lineup. From clean edges to full beard maintenance.",
        price: "₱200",
        unit: "/ session",
      },
      {
        icon: "◈",
        title: "HOT TOWEL SHAVE",
        description:
          "Classic straight razor shave with hot towel treatment. The ultimate barbershop luxury experience.",
        price: "₱350",
        unit: "/ session",
      },
      {
        icon: "✦",
        title: "HAIR & SCALP TREATMENT",
        description:
          "Revitalize your hair and scalp with our premium treatment using professional-grade products.",
        price: "₱400",
        unit: "/ session",
      },
      {
        icon: "⬡",
        title: "THE EXECUTIVE PACKAGE",
        description:
          "Full grooming experience — haircut, beard trim, hot towel shave, and styling. Walk out like a boss.",
        price: "₱650",
        unit: "/ package",
      },
    ],
  },
  craft: {
    label: "Precision & Mastery",
    title: "THE CRAFT",
    subtitle: "Every cut tells a story of skill",
    labels: [
      {
        position: "top",
        title: "PRECISION FADES",
        description:
          "Seamless gradients from skin to length, tailored to your style",
      },
      {
        position: "left",
        title: "CLASSIC CUTS",
        description: "Timeless styles with a modern edge and meticulous detail",
      },
      {
        position: "right",
        title: "BEARD GROOMING",
        description: "Sculpted lines, hot towel treatment, and premium balms",
      },
      {
        position: "bottom",
        title: "PREMIUM STYLING",
        description: "Professional finishing with top-tier grooming products",
      },
    ],
    ctaText: "Experience the difference craftsmanship makes",
    cta: { label: "BOOK YOUR CUT", href: "#contact", arrow: true },
    portraitBefore:
      "https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?q=80",
    portraitAfter:
      "https://images.unsplash.com/photo-1630827020718-3433092696e7?q=80",
  },
  about: {
    label: "Our Story",
    titleLines: ["MORE THAN", "A HAIRCUT"],
    text: "Ronie's Barber Shop was born from a passion for the craft. What started as a small neighborhood barbershop in Cagayan de Oro has grown into a premium grooming destination for men who value precision, style, and an unmatched experience. Every chair tells a story. Every cut is a masterpiece.",
    features: [
      "Skilled Master Barbers",
      "Premium Products",
      "Hygienic Environment",
      "Walk-ins Welcome",
      "Relaxed Atmosphere",
      "Affordable Luxury",
    ],
    cta: { label: "VISIT THE SHOP", href: "#contact", arrow: true },
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
    badgeValue: "10+",
    badgeLabel: "Years of Craft",
  },
  barbers: {
    heading: {
      label: "The Team",
      title: "MEET OUR BARBERS",
      subtitle: "Master craftsmen behind every cut",
    },
    items: [
      {
        name: "RONIE",
        role: "OWNER & MASTER BARBER",
        bio: "10+ years of barbering excellence. Specializes in classic cuts and skin fades.",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
        socials: [
          { label: "IG", href: "#", ariaLabel: "Instagram" },
          { label: "FB", href: "#", ariaLabel: "Facebook" },
        ],
      },
      {
        name: "MARCO",
        role: "SENIOR BARBER",
        bio: "Expert in modern styles, textured crops, and creative designs.",
        image:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80",
        socials: [
          { label: "IG", href: "#", ariaLabel: "Instagram" },
          { label: "FB", href: "#", ariaLabel: "Facebook" },
        ],
      },
      {
        name: "JAYDEN",
        role: "STYLE SPECIALIST",
        bio: "Known for precise lineups, beard artistry, and fresh fades.",
        image:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80",
        socials: [
          { label: "IG", href: "#", ariaLabel: "Instagram" },
          { label: "FB", href: "#", ariaLabel: "Facebook" },
        ],
      },
      {
        name: "CARLO",
        role: "JUNIOR BARBER",
        bio: "Rising talent with a keen eye for trending styles and clean finishes.",
        image:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80",
        socials: [
          { label: "IG", href: "#", ariaLabel: "Instagram" },
          { label: "FB", href: "#", ariaLabel: "Facebook" },
        ],
      },
    ],
  },
  gallery: {
    heading: {
      label: "Our Work",
      title: "HAIRCUT GALLERY",
    },
    items: [
      {
        title: "TEXTURED CROP FADE",
        by: "By Ronie",
        image:
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80",
        wide: true,
      },
      {
        title: "CLEAN SKIN FADE",
        by: "By Marco",
        image:
          "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
      },
      {
        title: "CLASSIC POMPADOUR",
        by: "By Jayden",
        image:
          "https://images.unsplash.com/photo-1621605815971-fbc98d665571?w=600&q=80",
      },
      {
        title: "BEARD LINEUP",
        by: "By Carlo",
        image:
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
      },
      {
        title: "TAPER FADE",
        by: "By Ronie",
        image:
          "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
      },
      {
        title: "MID FADE + DESIGN",
        by: "By Marco",
        image:
          "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=900&q=80",
        wide: true,
      },
    ],
  },
  products: {
    heading: {
      label: "Shop",
      title: "GROOMING ESSENTIALS",
      subtitle: "Premium products for the modern gentleman",
    },
    items: [
      {
        icon: "🧴",
        name: "MATTE CLAY POMADE",
        description: "Strong hold, natural finish",
        price: "₱450",
        tag: "BEST SELLER",
      },
      {
        icon: "🪒",
        name: "BEARD OIL SERUM",
        description: "Hydrating argan blend",
        price: "₱380",
      },
      {
        icon: "💈",
        name: "SEA SALT TEXTURE SPRAY",
        description: "Volume & wave enhancer",
        price: "₱320",
        tag: "NEW",
      },
      {
        icon: "✨",
        name: "AFTERSHAVE BALM",
        description: "Cooling menthol formula",
        price: "₱280",
      },
    ],
  },
  testimonials: {
    heading: {
      label: "Reviews",
      title: "WHAT CLIENTS SAY",
      subtitle: "Real reviews from real gentlemen",
    },
    items: [
      {
        rating: 5,
        text: "“Best barbershop in CDO, hands down. Ronie knows exactly what cut suits you even if you can't explain it. The vibe, the music, the quality — everything is top tier.”",
        author: "JUAN REYES",
        meta: "Regular Client · 3 Years",
        initials: "JR",
      },
      {
        rating: 5,
        text: "“I've been to many barbershops but Ronie's hits different. Clean shop, friendly barbers, and my fade was absolutely perfect. Already booked my next visit.”",
        author: "MARK DELA CRUZ",
        meta: "Walk-in Client",
        initials: "MD",
      },
      {
        rating: 5,
        text: "“As a college student, finding an affordable yet premium barbershop was tough until I discovered Ronie's. The Executive Package is worth every peso — I always leave feeling like a million bucks.”",
        author: "KYLE SANTOS",
        meta: "Student · Regular",
        initials: "KS",
      },
    ],
  },
  ctaBanner: {
    label: "Ready?",
    titleLines: ["BOOK YOUR", "NEXT CUT"],
    description:
      "Walk-ins are welcome, but appointments guarantee your spot. Message us or drop by the shop — your fresh look is waiting.",
    primaryCta: { label: "BOOK NOW", href: "#contact", arrow: true },
    callCta: { label: "CALL US", href: "tel:+639171234567" },
  },
  contact: {
    label: "Get In Touch",
    titleLines: ["LET'S GET", "YOU BOOKED"],
    intro:
      "Drop by the shop, send us a message, or book through our socials. We're here to make sure you look your absolute best.",
    details: [
      {
        icon: "📍",
        title: "LOCATION",
        lines: ["Ronie's Barber Shop", "Cagayan de Oro City, Philippines"],
      },
      {
        icon: "🕐",
        title: "HOURS",
        lines: [
          "Monday — Saturday: 9:00 AM — 8:00 PM",
          "Sunday: 10:00 AM — 6:00 PM",
        ],
      },
      {
        icon: "📱",
        title: "PHONE",
        lines: ["0917-123-4567"],
      },
      {
        icon: "✉",
        title: "SOCIALS",
        lines: ["@roniesbarbershop on Facebook & Instagram"],
      },
    ],
    serviceOptions: [
      { label: "Signature Haircut — ₱250" },
      { label: "Skin Fade — ₱300" },
      { label: "Beard Sculpting — ₱200" },
      { label: "Hot Towel Shave — ₱350" },
      { label: "Hair & Scalp Treatment — ₱400" },
      { label: "The Executive Package — ₱650" },
    ],
    barberOptions: [
      { label: "Ronie" },
      { label: "Marco" },
      { label: "Jayden" },
      { label: "Carlo" },
    ],
  },
  footer: {
    description:
      "Premium men's grooming experience in Cagayan de Oro. Where style meets craft, and every cut tells a story.",
    columns: [
      {
        title: "QUICK LINKS",
        links: [
          { label: "Services", href: "#services" },
          { label: "About", href: "#about" },
          { label: "Barbers", href: "#barbers" },
          { label: "Gallery", href: "#gallery" },
        ],
      },
      {
        title: "SERVICES",
        links: [
          { label: "Haircuts", href: "#services" },
          { label: "Skin Fades", href: "#services" },
          { label: "Beard Grooming", href: "#services" },
          { label: "Hot Towel Shave", href: "#services" },
        ],
      },
      {
        title: "HOURS",
        links: [
          { label: "Mon — Sat: 9AM — 8PM", href: "#contact" },
          { label: "Sunday: 10AM — 6PM", href: "#contact" },
          { label: "Walk-ins Welcome", href: "#contact" },
          { label: "Book Online", href: "#contact" },
        ],
      },
    ],
    copyright: "© 2026 Ronie's Barber Shop. All rights reserved.",
    credit: "Crafted by AliAmz Digital",
    socials: [
      { label: "FB", href: "#", ariaLabel: "Facebook" },
      { label: "IG", href: "#", ariaLabel: "Instagram" },
      { label: "TK", href: "#", ariaLabel: "TikTok" },
    ],
  },
  floatingCta: { label: "✂ BOOK NOW", href: "#contact" },
};
