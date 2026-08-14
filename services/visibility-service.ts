import type { Business } from "@/types/business-entity";
import type { BusinessProfile } from "@/types/business";
import { coordinatesOf } from "@/lib/geo/coordinates";
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
  // No `hasCoordinatesField` either, for the same reason as the FAQ: the
  // columns exist platform-wide (migration 0038), but whether a given tenant
  // has PINNED their location is their own data — see hasCoordinates.
  // No `hasImageAltField` either: gallery items now carry an `alt`, so what
  // matters is how many of THIS tenant's photos have one — see describedImageCount.
} as const;

export class VisibilityService {
  /**
   * Analyze a business's AI/SEO readiness. Pure — the caller supplies the
   * business (null when the owner hasn't created one yet), so this needs no
   * database access of its own.
   */
  /**
   * @param profile What the tenant's site actually PUBLISHES — the resolved
   *   profile, template defaults merged over stored content, exactly as
   *   app/s/[slug] renders it.
   *
   *   Content checks read this, not `business.content`. The two differ for
   *   every tenant who hasn't opened the CMS: the stored column is null while
   *   the live page shows the template's own gallery and questions AND emits
   *   FAQPage markup for them. Scoring the stored value reported "No FAQ
   *   content exists" about a page publishing five questions — measuring the
   *   database where the subject is the website.
   *
   *   Null only when the caller couldn't resolve one, which falls back to the
   *   stored content rather than failing the report.
   */
  analyze(
    business: Business | null,
    profile: BusinessProfile | null = null,
  ): VisibilityReport {
    return business
      ? scoreReport(true, buildChecks(business, profile))
      : scoreReport(false, baselineChecks());
  }
}

/* --- Check construction --------------------------------------------------- */

function has(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Both halves of the pin, and both real numbers — see `coordinatesOf`. */
function hasCoordinates(business: Business): boolean {
  return coordinatesOf(business) !== null;
}

function openDayCount(business: Business): number {
  return business.hours.filter((h) => !h.closed && h.open && h.close).length;
}

/**
 * The gallery the SITE shows.
 *
 * `profile` is the resolved one — template defaults merged over stored content
 * — so an un-customized tenant is measured on the photographs their visitors
 * actually see, not on an empty database column. Falls back to the stored
 * content when no profile could be resolved.
 */
function galleryImageCount(
  business: Business,
  profile: BusinessProfile | null,
): number {
  return (profile?.gallery.items ?? business.content.gallery?.items ?? []).length;
}

/**
 * Gallery photos carrying a real description.
 *
 * An alt equal to the title is NOT counted. It is what the template did before
 * this field existed, and it leaves a screen-reader user hearing the same words
 * twice — scoring it would reward the exact defect the field was added to fix.
 * (The save schema refuses it too; this guards content stored before that.)
 */
function describedImageCount(
  business: Business,
  profile: BusinessProfile | null,
): number {
  const items = profile?.gallery.items ?? business.content.gallery?.items ?? [];
  return items.filter((item) => {
    const alt = item.alt?.trim();
    return Boolean(alt) && alt!.toLowerCase() !== item.title.trim().toLowerCase();
  }).length;
}

/**
 * Published questions, counted the same way buildFaqJsonLd counts them: a row
 * missing either half is dropped from the markup, so it must not score here.
 *
 * Read from the RESOLVED profile — the same array app/s/[slug] hands to
 * buildFaqJsonLd. Anything else scores a different set of questions from the
 * ones in the markup.
 */
function faqItemCount(
  business: Business,
  profile: BusinessProfile | null,
): number {
  const items = profile?.faq.items ?? business.content.faq?.items ?? [];
  return items.filter((item) => item.question.trim() && item.answer.trim())
    .length;
}

/** True when the tenant has never saved this section — it is still the template's. */
function isTemplateDefault(
  business: Business,
  section: "faq" | "gallery",
): boolean {
  return business.content[section] === null;
}

function buildChecks(
  b: Business,
  profile: BusinessProfile | null,
): VisibilityCheck[] {
  const descLen = b.description?.trim().length ?? 0;
  const gallery = galleryImageCount(b, profile);
  const openDays = openDayCount(b);
  const faqCount = faqItemCount(b, profile);
  const described = describedImageCount(b, profile);
  const faqIsDefault = isTemplateDefault(b, "faq");

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
  (hasCoordinates(b) ? localReady : localMissing).push("geo");

  return [
    /* --- Structured data --- */
    {
      id: "schema-org",
      label: "Your details, in a form machines read",
      category: "structured-data",
      weight: 12,
      status: PLATFORM.hasJsonLd ? "pass" : "fail",
      finding: PLATFORM.hasJsonLd
        ? "Your name, contact details and hours are published in the format Google and AI assistants read directly, alongside the page people see."
        : "Your details aren't published in a form search engines and AI assistants can read.",
      recommendation: PLATFORM.hasJsonLd
        ? "Nothing to do — this updates itself whenever you edit your contact details."
        : "Contact us — this is published by the platform, not something you set up.",
    },
    {
      id: "local-business",
      label: "Recognised as a local business",
      category: "structured-data",
      weight: 12,
      status: PLATFORM.hasJsonLd ? "pass" : has(b.address) ? "warn" : "fail",
      finding: PLATFORM.hasJsonLd
        ? "Search engines are told you're a real business with a place, not just a website — the difference that gets you into “near me” results."
        : `Not published yet. Ready: ${localReady.join(", ") || "none"}. Still needed: ${localMissing.join(", ") || "none"}.`,
      recommendation: PLATFORM.hasJsonLd
        ? "Keep your address, phone and opening hours current under Contact details — they're what this publishes."
        : "Fill in the missing details above under Contact details.",
    },
    {
      id: "faq",
      label: "Questions and answers",
      category: "content",
      weight: 6,
      // Per-tenant, not platform-level. The capability now exists for everyone,
      // so a constant here would award the points to every client the moment we
      // deployed — including the ones with an empty FAQ and no FAQPage markup.
      // Three is where a list starts reading as coverage rather than a token.
      /*
       * Still-default questions are a WARN even when there are enough of them.
       *
       * They are genuinely published, with FAQPage markup, so "fail" would be
       * false — but they are the template's generic answers, not this
       * business's. Full marks would tell an owner they were finished with the
       * single highest-value thing they could do.
       */
      status:
        faqCount === 0
          ? "fail"
          : faqIsDefault || faqCount < 3
            ? "warn"
            : "pass",
      finding:
        faqCount === 0
          ? "No FAQ content exists. Question/answer pairs are the format AI assistants quote from most readily."
          : faqIsDefault
            ? `${faqCount} starter question${faqCount === 1 ? "" : "s"} are published with FAQPage schema, but they are still the template's wording — not answers about your business.`
            : `${faqCount} question${faqCount === 1 ? "" : "s"} published with FAQPage schema.`,
      recommendation: faqIsDefault
        ? "Open Website → FAQ and rewrite the starter answers in your own words. Say what is actually true of your place — an assistant can only repeat what you publish, and generic answers are the ones it will skip."
        : faqCount >= 3
          ? "Keep answers current, and add questions as customers ask them."
          : "Add question/answer pairs under Website → FAQ. Answer what customers ask before booking (parking, walk-ins, payment, how long it takes) and write each answer so it stands on its own.",
    },

    /* --- Metadata --- */
    {
      id: "meta-tags",
      label: "How you appear in search results",
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
        ? "Your business name is missing, so search results have no title to show."
        : descLen === 0
          ? "You have no business description, so the grey summary line under your search result is empty."
          : descLen < 50
            ? `Your description is short (${descLen} characters). Around 50–160 fills the space Google gives you.`
            : descLen > 160
              ? `Your description is long (${descLen} characters) and Google will cut it off. Around 50–160 fits.`
              : `Your name and a well-sized description (${descLen} characters) are what people see in search results.`,
      recommendation:
        "Write a description under Contact details that says what you do and where — it's the sentence people read before deciding to click.",
    },
    {
      id: "open-graph",
      label: "Link previews",
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
      label: "Link previews on X",
      category: "metadata",
      weight: 4,
      status: PLATFORM.emitsTwitterImage ? "pass" : "warn",
      finding: PLATFORM.emitsTwitterImage
        ? "Your link shows the same large preview card on X as it does on Facebook and WhatsApp."
        : "Your link shows a plain preview on X, with no picture.",
      // Same image as Open Graph, so the same advice applies; saying it twice
      // in a checklist reads as two separate jobs.
      recommendation: has(b.logoUrl)
        ? "Nothing to do — this uses the same share card as Open Graph above."
        : "Covered by the Open Graph item above: upload a logo and both previews improve together.",
    },
    {
      id: "canonical",
      label: "One official web address",
      category: "technical",
      weight: 6,
      status: PLATFORM.hasCanonical ? "pass" : "fail",
      finding: PLATFORM.hasCanonical
        ? "Every page tells search engines its one official address, so your ranking isn't split between two versions of the same page."
        : "Pages don't declare an official address, so search engines may treat two versions of a page as competitors.",
      recommendation: PLATFORM.hasCanonical
        ? "Nothing to do. If you connect your own domain, mark it Primary under Domains so it becomes the official one."
        : "Contact us — this is handled by the platform, not something you set up.",
    },

    /* --- Crawlability --- */
    {
      id: "robots",
      label: "Search engines are let in",
      category: "crawlability",
      weight: 8,
      status: PLATFORM.hasRobots ? "pass" : "fail",
      finding: PLATFORM.hasRobots
        ? "Google and AI assistants are explicitly invited to read your public pages, and kept out of your dashboard."
        : "Nothing tells search engines which pages they may read.",
      recommendation: PLATFORM.hasRobots
        ? "Nothing to do — this is set up for you."
        : "Contact us — this is handled by the platform, not something you set up.",
    },
    {
      id: "sitemap",
      label: "A map of your site for search engines",
      category: "crawlability",
      weight: 8,
      status: PLATFORM.hasSitemap ? "pass" : "fail",
      finding: PLATFORM.hasSitemap
        ? "Your pages are listed for search engines, so they don't have to stumble across them."
        : "Search engines have no list of your pages and must find them by chance.",
      recommendation: PLATFORM.hasSitemap
        ? "Nothing to do — it updates itself as your site changes."
        : "Contact us — this is handled by the platform, not something you set up.",
    },

    /* --- Media --- */
    {
      id: "image-alt",
      label: "Photo descriptions",
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
      label: "Your exact location",
      category: "technical",
      weight: 6,
      // Per-tenant, not platform-level. The capability now exists for everyone
      // (migration 0038), so a constant here would award the points to every
      // client the moment we deployed — including the ones whose location is
      // still a street line nobody has pinned. Same correction the FAQ check
      // needed when that capability landed.
      status: hasCoordinates(b) ? "pass" : "fail",
      finding: hasCoordinates(b)
        ? "Your exact spot is pinned, so your site shows a live map and search engines know precisely where you are."
        : "You have an address but no map pin, so search engines have to guess where that is — and your site can't show a map.",
      recommendation: hasCoordinates(b)
        ? "Check the pin sits on the entrance guests actually use, not the middle of the plot."
        : "Open your place on Google Maps, copy the link from the address bar, and paste it under Contact details → Map location. We read the coordinates out of it.",
    },
    /*
     * The two rows nobody can pass or fail.
     *
     * Every other check above is answered from the owner's own data. Speed and
     * accessibility can only be judged by testing the live site, which is why
     * they carry no weight and sit at "info" — they are a note, not a score.
     *
     * They are ALSO the two rows a business owner reads, and they used to be
     * written to a developer: Core Web Vitals, Lighthouse, next/image, aria-
     * labels, axe. That is the wrong audience for this screen — the checklist
     * is in the client back office — and worse, it told an owner to go audit a
     * site whose speed we already handle for them (pre-rendered pages,
     * per-device image sizing). Rewritten for the person actually reading it,
     * with the one part that IS theirs — describing photographs — named
     * plainly, so the row points at the gallery instead of at a dead end.
     */
    {
      id: "performance",
      label: "Speed",
      category: "technical",
      weight: 0,
      status: "info",
      finding:
        "How fast your pages feel can only be judged by testing the live site, not from your details.",
      recommendation:
        "Your pages are built ready-made and your photographs are sized for whatever screen is looking, so they open quickly. If a page ever feels slow, tell us and we'll look at it.",
    },
    {
      id: "accessibility",
      label: "Easy for everyone to use",
      category: "technical",
      weight: 0,
      status: "info",
      finding:
        "Your site is built to work on any phone and to be usable without a mouse. A full check needs a person to test it.",
      recommendation:
        "The part in your hands is your photographs — give each one a short description under Website → Gallery, so visitors who can't see them still know what's there.",
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
      retreat: null,
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
    lodgingDetails: null,
    latitude: null,
    longitude: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    // No profile: there is no business yet, so there is no published page to
    // measure. Every content check falls back to the empty stored content,
    // which is the honest baseline.
  }, null);
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
