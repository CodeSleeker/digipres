import { describe, it, expect } from "vitest";
import { faqSchema, SECTION_SCHEMA } from "@/schemas/website-content";
import { buildFaqJsonLd } from "@/lib/seo/json-ld";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { ronies } from "@/lib/businesses/ronies";
import { VisibilityService } from "@/services/visibility-service";
import { WEBSITE_SECTIONS, SECTION_COLUMN } from "@/types/website-content";
import type { Business } from "@/types/business-entity";
import type { FaqContent } from "@/types/website-content";

/**
 * The FAQ section exists for machines as much as for readers: an answer engine
 * quotes `acceptedAnswer.text` directly. That makes one rule load-bearing —
 * the JSON-LD and the rendered page must describe the SAME questions. Google
 * treats markup for content not visible on the page as a policy violation, and
 * an assistant quoting an answer the visitor cannot find is worse than no
 * answer at all.
 */

const faq = (items: { question: string; answer: string }[]): FaqContent => ({
  heading: { label: "l", title: "t", subtitle: "s" },
  items,
});

const business = (over: Partial<Business> = {}): Business =>
  ({
    slug: "ronnie-barbershop",
    name: "Ronnie Barbershop",
    hours: [],
    address: null,
    phone: null,
    facebookUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    googleReviewUrl: null,
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      products: null,
      testimonials: null,
      faq: null,
      contact: null,
      footer: null,
    },
    ...over,
  }) as unknown as Business;

const withFaq = (items: { question: string; answer: string }[]) =>
  business({
    content: { ...business().content, faq: faq(items) },
  });

const QA = [
  { question: "Do I need an appointment?", answer: "Walk-ins are welcome." },
  { question: "Do you take card?", answer: "Cash and GCash only." },
  { question: "How long is a cut?", answer: "About 45 minutes." },
];

describe("FAQ — the template default", () => {
  it("ships with NO questions", () => {
    // The section that made this necessary: template testimonials published
    // quotes attributed to people who were never anyone's customers. An FAQ is
    // the same hazard in a worse place — a seeded "Yes, we accept walk-ins"
    // becomes the business's own words once it is inside FAQPage markup.
    expect(ronies.faq.items).toEqual([]);
  });

  it("renders nothing and emits no schema for an un-customized tenant", () => {
    const profile = buildBusinessProfile(ronies, business());
    expect(profile.faq.items).toEqual([]);
    expect(buildFaqJsonLd(profile.faq.items)).toBeNull();
  });

  it("drops the FAQ nav link when there is nothing to jump to", () => {
    // #faq is a static entry on the template default; without filtering it
    // would scroll nowhere on every site that has no FAQ.
    const empty = buildBusinessProfile(ronies, business());
    expect(empty.nav.some((n) => n.href === "#faq")).toBe(false);

    const filled = buildBusinessProfile(ronies, withFaq(QA));
    expect(filled.nav.some((n) => n.href === "#faq")).toBe(true);
  });
});

describe("FAQ — stored content wins", () => {
  it("uses the tenant's own questions", () => {
    const profile = buildBusinessProfile(ronies, withFaq(QA));
    expect(profile.faq.items).toHaveLength(3);
    expect(profile.faq.items[0].question).toBe("Do I need an appointment?");
  });
});

describe("FAQPage JSON-LD", () => {
  it("emits one Question node per published item", () => {
    const data = buildFaqJsonLd(QA)!;
    expect(data["@type"]).toBe("FAQPage");
    const entities = data.mainEntity as Record<string, unknown>[];
    expect(entities).toHaveLength(3);
    expect(entities[0]).toEqual({
      "@type": "Question",
      name: "Do I need an appointment?",
      acceptedAnswer: { "@type": "Answer", text: "Walk-ins are welcome." },
    });
  });

  it("returns null rather than an empty FAQPage", () => {
    // An FAQPage with no mainEntity is invalid structured data, and emitting
    // one on every page would be worse than emitting none.
    expect(buildFaqJsonLd([])).toBeNull();
  });

  it("drops a row missing either half", () => {
    // A half-filled row renders as a heading with no answer beneath it. Marking
    // it up would claim an answer the page does not show.
    const data = buildFaqJsonLd([
      { question: "Answered?", answer: "Yes." },
      { question: "No answer yet", answer: "   " },
      { question: "  ", answer: "Orphaned answer." },
    ])!;
    expect(data.mainEntity).toHaveLength(1);
  });

  it("trims, so whitespace never reaches the markup", () => {
    const data = buildFaqJsonLd([
      { question: "  Padded?  ", answer: "  Yes.  " },
    ])!;
    const [first] = data.mainEntity as Record<string, unknown>[];
    expect(first.name).toBe("Padded?");
    expect((first.acceptedAnswer as { text: string }).text).toBe("Yes.");
  });
});

describe("FAQ validation", () => {
  it("accepts an EMPTY list — the only section that may", () => {
    // This is how an owner takes a published FAQ down. Every other section
    // falls back to template content, so an empty save there would publish a
    // blank strip; here the section simply disappears.
    expect(faqSchema.safeParse(faq([])).success).toBe(true);
  });

  it("refuses a question with no answer", () => {
    const result = faqSchema.safeParse(faq([{ question: "Q?", answer: "" }]));
    expect(result.success).toBe(false);
  });

  it("refuses an answer with no question", () => {
    const result = faqSchema.safeParse(faq([{ question: "", answer: "A." }]));
    expect(result.success).toBe(false);
  });

  it("caps answer length so items stay quotable", () => {
    const long = faq([{ question: "Q?", answer: "x".repeat(1201) }]);
    expect(faqSchema.safeParse(long).success).toBe(false);
  });

  it("is wired into the generic save action", () => {
    // The save action dispatches through SECTION_SCHEMA; a section missing
    // from it cannot be saved at all.
    expect(SECTION_SCHEMA.faq).toBe(faqSchema);
  });
});

describe("FAQ — platform wiring", () => {
  it("is a known section with a storage column", () => {
    expect(WEBSITE_SECTIONS).toContain("faq");
    expect(SECTION_COLUMN.faq).toBe("faq_content");
  });
});

describe("visibility check reads the TENANT's questions", () => {
  const scoreOf = (b: Business) =>
    new VisibilityService().analyze(b).checks.find((c) => c.id === "faq")!;

  it("fails a tenant with no FAQ", () => {
    // Previously a platform-level constant, which would have handed every
    // client the points the moment this shipped — empty FAQ included.
    expect(scoreOf(business()).status).toBe("fail");
  });

  it("warns on a token FAQ", () => {
    expect(scoreOf(withFaq(QA.slice(0, 1))).status).toBe("warn");
  });

  it("passes once there is real coverage", () => {
    const check = scoreOf(withFaq(QA));
    expect(check.status).toBe("pass");
    expect(check.finding).toContain("3 questions");
  });

  it("does not count rows that never reach the markup", () => {
    // Counted the same way buildFaqJsonLd counts them, or the score would
    // credit questions no assistant can read.
    const check = scoreOf(
      withFaq([...QA, { question: "Half written", answer: "" }]),
    );
    expect(check.finding).toContain("3 questions");
  });
});
