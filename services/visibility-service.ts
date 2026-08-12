import type { Business } from "@/types/business-entity";
import type {
  CheckStatus,
  VisibilityCheck,
  VisibilityReport,
} from "@/types/ai-visibility";

/**
 * AI Visibility analyzer.
 *
 * Inspects the tenant's business data and the site's current SEO surface, then
 * returns an actionable checklist plus an "AI Readiness Score". It ONLY produces
 * recommendations — it never claims or guarantees any AI/search ranking.
 *
 * Some checks are platform-level (the whole app either emits robots.txt / a
 * sitemap / JSON-LD, or it doesn't). Those live in PLATFORM below and flip to
 * `true` as the corresponding features are built; the rest are data-driven off
 * the owner's business.
 */

/**
 * Current implementation state of app-wide SEO features. Update these as the
 * platform gains the capability (e.g. add app/robots.ts → set hasRobots true).
 */
const PLATFORM = {
  emitsMetaTags: true, // app/page.tsx generateMetadata sets title + description
  // app/s/[slug]/opengraph-image.tsx generates a 1200×630 card per tenant.
  // Next's file convention emits BOTH og:image and twitter:image from it —
  // verified against the rendered page, not assumed from the docs.
  emitsOgImage: true,
  emitsTwitterImage: true,
  hasCanonical: true, // tenant pages set metadataBase + alternates.canonical
  hasRobots: true, // app/robots.ts
  hasSitemap: true, // app/sitemap.ts (lists active tenant slugs)
  hasJsonLd: true, // LocalBusiness JSON-LD emitted on tenant pages
  // No `hasFaqSection` here on purpose. The FAQ section exists platform-wide
  // (migration 0031), but whether a given tenant HAS questions is their own
  // data — see faqItemCount, which the check reads instead.
  hasCoordinatesField: false, // Business entity has no lat/lng
  // No `hasImageAltField` either: gallery items now carry an `alt`, so what
  // matters is how many of THIS tenant's photos have one — see describedImageCount.
} as const;

export class VisibilityService {
  /**
   * Analyze a business's AI/SEO readiness. Pure — the caller supplies the
   * business (null when the owner hasn't created one yet), so this needs no
   * database access of its own.
   */
  analyze(business: Business | null): VisibilityReport {
    return business
      ? scoreReport(true, buildChecks(business))
      : scoreReport(false, baselineChecks());
  }
}

/* --- Check construction --------------------------------------------------- */

function has(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function openDayCount(business: Business): number {
  return business.hours.filter((h) => !h.closed && h.open && h.close).length;
}

function galleryImageCount(business: Business): number {
  return business.content.gallery?.items.length ?? 0;
}

/**
 * Gallery photos carrying a real description.
 *
 * An alt equal to the title is NOT counted. It is what the template did before
 * this field existed, and it leaves a screen-reader user hearing the same words
 * twice — scoring it would reward the exact defect the field was added to fix.
 * (The save schema refuses it too; this guards content stored before that.)
 */
function describedImageCount(business: Business): number {
  return (business.content.gallery?.items ?? []).filter((item) => {
    const alt = item.alt?.trim();
    return Boolean(alt) && alt!.toLowerCase() !== item.title.trim().toLowerCase();
  }).length;
}

/**
 * Published questions, counted the same way buildFaqJsonLd counts them: a row
 * missing either half is dropped from the markup, so it must not score here.
 */
function faqItemCount(business: Business): number {
  return (business.content.faq?.items ?? []).filter(
    (item) => item.question.trim() && item.answer.trim(),
  ).length;
}

function buildChecks(b: Business): VisibilityCheck[] {
  const descLen = b.description?.trim().length ?? 0;
  const gallery = galleryImageCount(b);
  const openDays = openDayCount(b);
  const faqCount = faqItemCount(b);
  const described = describedImageCount(b);

  // Which LocalBusiness fields are ready to emit.
  const localReady: string[] = [];
  const localMissing: string[] = [];
  (has(b.name) ? localReady : localMissing).push("name");
  (has(b.address) ? localReady : localMissing).push("address");
  // Tracked separately from the street line, because it is the component that
  // actually places the business: without a locality nothing on the page says
  // which town this is, and a street line alone can't be resolved to one.
  (has(b.addressLocality) ? localReady : localMissing).push("city");
  (has(b.phone) ? localReady : localMissing).push("phone");
  (openDays > 0 ? localReady : localMissing).push("hours");
  (has(b.logoUrl) ? localReady : localMissing).push("logo");
  (PLATFORM.hasCoordinatesField ? localReady : localMissing).push("geo");

  return [
    /* --- Structured data --- */
    {
      id: "schema-org",
      label: "Schema.org",
      category: "structured-data",
      weight: 12,
      status: PLATFORM.hasJsonLd ? "pass" : "fail",
      finding: PLATFORM.hasJsonLd
        ? "Structured data (JSON-LD) is emitted on the public site."
        : "No Schema.org JSON-LD is emitted. AI assistants and search engines can't read structured facts about the business.",
      recommendation:
        "Add Organization and WebSite JSON-LD (name, url, logo, sameAs socials) to the public page head so machines can parse core business facts.",
    },
    {
      id: "local-business",
      label: "LocalBusiness Schema",
      category: "structured-data",
      weight: 12,
      status: PLATFORM.hasJsonLd ? "pass" : has(b.address) ? "warn" : "fail",
      finding: PLATFORM.hasJsonLd
        ? "LocalBusiness JSON-LD is emitted."
        : `No LocalBusiness JSON-LD yet. Ready fields: ${
            localReady.join(", ") || "none"
          }. Missing: ${localMissing.join(", ") || "none"}.`,
      recommendation:
        "Emit LocalBusiness JSON-LD (address, telephone, openingHours, geo, priceRange, sameAs). Fill the missing fields above — geo especially — for a complete entity.",
    },
    {
      id: "faq",
      label: "FAQ",
      category: "content",
      weight: 6,
      // Per-tenant, not platform-level. The capability now exists for everyone,
      // so a constant here would award the points to every client the moment we
      // deployed — including the ones with an empty FAQ and no FAQPage markup.
      // Three is where a list starts reading as coverage rather than a token.
      status: faqCount >= 3 ? "pass" : faqCount > 0 ? "warn" : "fail",
      finding:
        faqCount === 0
          ? "No FAQ content exists. Question/answer pairs are the format AI assistants quote from most readily."
          : `${faqCount} question${faqCount === 1 ? "" : "s"} published with FAQPage schema.`,
      recommendation:
        faqCount >= 3
          ? "Keep answers current, and add questions as customers ask them."
          : "Add question/answer pairs under Website → FAQ. Answer what customers ask before booking (parking, walk-ins, payment, how long it takes) and write each answer so it stands on its own.",
    },

    /* --- Metadata --- */
    {
      id: "meta-tags",
      label: "Meta Tags",
      category: "metadata",
      weight: 10,
      status: !has(b.name)
        ? "fail"
        : descLen === 0
          ? "fail"
          : descLen < 50 || descLen > 160
            ? "warn"
            : "pass",
      finding: !has(b.name)
        ? "Business name is missing, so the page title can't be generated."
        : descLen === 0
          ? "No business description, so the meta description is empty."
          : descLen < 50
            ? `Meta description is short (${descLen} chars). Aim for 50–160.`
            : descLen > 160
              ? `Meta description is long (${descLen} chars) and may be truncated. Aim for 50–160.`
              : `Title and a well-sized meta description (${descLen} chars) are generated.`,
      recommendation:
        "Keep a unique title and a 50–160 character description that names the business, category, and location.",
    },
    {
      id: "open-graph",
      label: "Open Graph",
      category: "metadata",
      weight: 6,
      status: PLATFORM.emitsOgImage ? "pass" : "warn",
      /*
       * The card is generated per tenant, so it always exists. What varies is
       * what goes ON it — which is the part the owner controls, and therefore
       * the only part worth reporting to them.
       */
      finding: !PLATFORM.emitsOgImage
        ? "Open Graph title/description are emitted, but no og:image."
        : has(b.logoUrl)
          ? "A 1200×630 share card is generated from your logo and business name, and og:image points at it."
          : "A 1200×630 share card is generated and og:image points at it, but with no logo uploaded it falls back to a tile showing your initial.",
      recommendation: has(b.logoUrl)
        ? "Nothing to do — links to your site render a branded preview. Adding your city under Contact details puts your location on the card too."
        : "Upload a logo under Branding. It replaces the initial tile on the share card people see when your link is posted to Messenger, Facebook or Viber.",
    },
    {
      id: "twitter-cards",
      label: "Twitter Cards",
      category: "metadata",
      weight: 4,
      status: PLATFORM.emitsTwitterImage ? "pass" : "warn",
      finding: PLATFORM.emitsTwitterImage
        ? "A summary_large_image card is emitted, using the same generated share image as Open Graph."
        : "A summary_large_image card is declared but has no image, so it falls back to a plain card.",
      // Same image as Open Graph, so the same advice applies; saying it twice
      // in a checklist reads as two separate jobs.
      recommendation: has(b.logoUrl)
        ? "Nothing to do — this uses the same share card as Open Graph above."
        : "Covered by the Open Graph item above: upload a logo and both previews improve together.",
    },
    {
      id: "canonical",
      label: "Canonical URLs",
      category: "technical",
      weight: 6,
      status: PLATFORM.hasCanonical ? "pass" : "fail",
      finding: PLATFORM.hasCanonical
        ? "A canonical URL is set per page."
        : "No canonical URL or metadataBase is set, risking duplicate-content ambiguity across domains/paths.",
      recommendation:
        "Set metadataBase to the tenant's domain and alternates.canonical to the page's absolute URL.",
    },

    /* --- Crawlability --- */
    {
      id: "robots",
      label: "Robots.txt",
      category: "crawlability",
      weight: 8,
      status: PLATFORM.hasRobots ? "pass" : "fail",
      finding: PLATFORM.hasRobots
        ? "robots.txt is served and references the sitemap."
        : "No robots.txt is served. Crawlers and AI bots have no explicit crawl guidance.",
      recommendation:
        "Add app/robots.ts allowing public pages, disallowing /admin and /api, and pointing to sitemap.xml.",
    },
    {
      id: "sitemap",
      label: "Sitemap.xml",
      category: "crawlability",
      weight: 8,
      status: PLATFORM.hasSitemap ? "pass" : "fail",
      finding: PLATFORM.hasSitemap
        ? "A sitemap.xml is generated and served."
        : "No sitemap.xml exists, so crawlers must discover pages on their own.",
      recommendation:
        "Add app/sitemap.ts listing the public page(s) with lastModified so crawlers index efficiently.",
    },

    /* --- Media --- */
    {
      id: "image-alt",
      label: "Image Alt Text",
      category: "media",
      weight: 6,
      // Per-tenant, and scoped to the images that actually need describing.
      //
      // The old wording named the logo and the cover, and both were wrong: the
      // logo's alt is derived (empty when the name sits beside it as text, the
      // name when it doesn't), and the cover is never rendered as an <img> at
      // all — it only feeds the JSON-LD `image` value, where alt has no
      // meaning. That left gallery photos, which is the real gap.
      status:
        gallery === 0 ? "warn" : described === gallery ? "pass" : described > 0 ? "warn" : "fail",
      finding:
        gallery === 0
          ? "No gallery images to describe yet."
          : described === gallery
            ? `All ${gallery} gallery image${gallery > 1 ? "s carry" : " carries"} a description.`
            : `${gallery - described} of ${gallery} gallery images have no description, so the title is announced instead — and it is already on screen beside the photo.`,
      recommendation:
        described === gallery && gallery > 0
          ? "Keep descriptions in step with the photos when they are replaced."
          : "Fill in 'Describe the photo' under Website → Gallery. Say what is in the shot (subject, then context) rather than repeating the title.",
    },

    /* --- Technical --- */
    {
      id: "coordinates",
      label: "Business Coordinates",
      category: "technical",
      weight: 6,
      status: PLATFORM.hasCoordinatesField ? "pass" : "fail",
      finding: PLATFORM.hasCoordinatesField
        ? "Latitude/longitude are stored for the business."
        : "No latitude/longitude are captured, so geo can't be added to LocalBusiness schema or an embedded map.",
      recommendation:
        "Capture lat/lng (e.g. from the address) to power LocalBusiness geo, a map embed, and near-me discovery.",
    },
    {
      id: "performance",
      label: "Performance",
      category: "technical",
      weight: 0,
      status: "info",
      finding:
        "Performance can't be measured from data alone; it needs a live audit (Core Web Vitals).",
      recommendation:
        "Run Lighthouse / PageSpeed Insights, serve images via next/image with sized assets, and cache static content. Fast pages help crawlers and users alike.",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      category: "technical",
      weight: 0,
      status: "info",
      finding:
        "The page sets lang=\"en\" and social links have aria-labels; full a11y needs a manual/automated audit.",
      recommendation:
        "Verify colour contrast, heading order, keyboard navigation, and image alt text. Run axe or Lighthouse a11y. Accessible pages are also more machine-readable.",
    },
  ];
}

/** Checks shown when there's no business yet (all data-driven items fail). */
function baselineChecks(): VisibilityCheck[] {
  return buildChecks({
    id: "",
    ownerId: "",
    name: "",
    slug: "",
    description: null,
    phone: null,
    email: null,
    notifyEmail: null,
    notifyPhone: null,
    notifyCustomerSms: true,
    smsSenderId: null,
    newsletterFromEmail: null,
    newsletterFromName: null,
    newsletterVerified: false,
    newsletterVerifiedAt: null,
    address: null,
    addressLocality: null,
    addressRegion: null,
    addressPostalCode: null,
    addressCountry: null,
    logoUrl: null,
    wordmarkUrl: null,
    faviconUrl: null,
    coverImageUrl: null,
    category: "other",
    ownerName: null,
    hours: [],
    googleReviewUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    websiteUrl: null,
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      journal: null,
      products: null,
      testimonials: null,
      faq: null,
      contact: null,
      footer: null,
    },
    onboarding: { completedSteps: [] },
    templateCode: "barber-luxury",
    themeCode: "default",
    status: "draft",
    brand: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  });
}

/* --- Scoring -------------------------------------------------------------- */

const EARNED: Record<CheckStatus, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
  info: 0,
};

function scoreReport(
  hasBusiness: boolean,
  checks: VisibilityCheck[],
): VisibilityReport {
  const scorable = checks.filter((c) => c.weight > 0);
  const totalWeight = scorable.reduce((s, c) => s + c.weight, 0);
  const earned = scorable.reduce(
    (s, c) => s + c.weight * EARNED[c.status],
    0,
  );
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;
  const { grade, gradeLabel } = gradeFor(score);

  return {
    hasBusiness,
    score,
    grade,
    gradeLabel,
    passCount: checks.filter((c) => c.status === "pass").length,
    warnCount: checks.filter((c) => c.status === "warn").length,
    failCount: checks.filter((c) => c.status === "fail").length,
    infoCount: checks.filter((c) => c.status === "info").length,
    checks,
  };
}

function gradeFor(score: number): { grade: string; gradeLabel: string } {
  if (score >= 90) return { grade: "A", gradeLabel: "Excellent" };
  if (score >= 75) return { grade: "B", gradeLabel: "Strong" };
  if (score >= 55) return { grade: "C", gradeLabel: "Developing" };
  if (score >= 35) return { grade: "D", gradeLabel: "Needs work" };
  return { grade: "E", gradeLabel: "Getting started" };
}
