import { describe, it, expect } from "vitest";
import { VisibilityService } from "@/services/visibility-service";
import type { Business } from "@/types/business-entity";
import type { VisibilityCheck } from "@/types/ai-visibility";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { gloria } from "@/lib/businesses/gloria";

/**
 * The AI Visibility report is shown to CLIENTS, and its `PLATFORM` flags are
 * hand-maintained claims about what the app emits. Nothing previously tested
 * them, so a flag could sit stale — telling every tenant they were missing a
 * feature that shipped months ago — and the score would move with nothing to
 * catch it. These tests pin the claims that are checkable from here.
 */

const service = new VisibilityService();

const business = (over: Partial<Business> = {}): Business =>
  ({
    name: "Coastline Barbers",
    description:
      "Precision cuts and classic barbering in the heart of Cagayan de Oro, open six days a week.",
    phone: "+639171234567",
    address: "12 Seaside Road",
    addressLocality: "Cagayan de Oro",
    logoUrl: null,
    coverImageUrl: null,
    hours: [],
    content: {},
    ...over,
  }) as unknown as Business;

const find = (checks: VisibilityCheck[], id: string): VisibilityCheck => {
  const check = checks.find((c) => c.id === id);
  if (!check) throw new Error(`no check with id "${id}"`);
  return check;
};

describe("share-image checks", () => {
  it("reports Open Graph and Twitter as passing, because both are emitted", () => {
    // Verified against the rendered tenant page: app/s/[slug]/opengraph-image.tsx
    // produces og:image AND twitter:image via Next's file convention.
    const { checks } = service.analyze(business());
    expect(find(checks, "open-graph").status).toBe("pass");
    expect(find(checks, "twitter-cards").status).toBe("pass");
  });

  it("never tells the owner to do something the platform already did", () => {
    // The old recommendation said "set metadataBase and openGraph.images",
    // which is not a thing a barber can act on and was already done.
    for (const id of ["open-graph", "twitter-cards"]) {
      const { recommendation } = find(service.analyze(business()).checks, id);
      expect(recommendation).not.toMatch(/metadataBase|openGraph\.images|twitter\.images/);
    }
  });

  it("points at the logo when there isn't one, since that is what the owner controls", () => {
    const withoutLogo = find(
      service.analyze(business({ logoUrl: null })).checks,
      "open-graph",
    );
    expect(withoutLogo.finding).toMatch(/initial/i);
    expect(withoutLogo.recommendation).toMatch(/logo/i);
  });

  it("says there is nothing to do once a logo exists", () => {
    const withLogo = find(
      service.analyze(business({ logoUrl: "https://cdn/logo.png" })).checks,
      "open-graph",
    );
    expect(withLogo.finding).toMatch(/logo/i);
    expect(withLogo.finding).not.toMatch(/initial/i);
    expect(withLogo.recommendation).toMatch(/nothing to do/i);
  });

  it("does not bill the same fix twice across the two checks", () => {
    // One generated image serves both tags. Two separate "upload a logo" jobs
    // in one checklist reads as twice the work.
    const checks = service.analyze(business({ logoUrl: null })).checks;
    expect(find(checks, "twitter-cards").recommendation).toMatch(
      /open graph/i,
    );
  });
});

describe("report scoring", () => {
  it("never exceeds its own bounds", () => {
    for (const b of [
      business(),
      business({ logoUrl: "https://cdn/logo.png" }),
      business({ description: "", phone: null, address: null }),
    ]) {
      const { score } = service.analyze(b);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("counts every check exactly once", () => {
    const r = service.analyze(business());
    expect(r.passCount + r.warnCount + r.failCount + r.infoCount).toBe(
      r.checks.length,
    );
  });

  it("still produces a baseline report with no business at all", () => {
    // The owner sees this before onboarding; it must not throw or score NaN.
    const r = service.analyze(null);
    expect(r.hasBusiness).toBe(false);
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.checks.length).toBeGreaterThan(0);
  });

  it("gives no check a ranking guarantee", () => {
    // The skill is explicit: optimise discoverability, never promise placement.
    for (const c of service.analyze(business()).checks) {
      expect(`${c.finding} ${c.recommendation}`).not.toMatch(
        /guarantee|rank #|top of google|first page/i,
      );
    }
  });
});

/**
 * The report describes the PAGE, not the database row.
 *
 * The two diverge for every tenant who has not opened the CMS: the stored
 * content columns are null while the live site publishes the template's own
 * gallery and questions — with FAQPage markup for them. Scoring the stored
 * value reported "No FAQ content exists" about a page publishing five.
 */
describe("measured against the published page, not the stored row", () => {
  const retreat = (over: Partial<Business> = {}): Business =>
    business({
      templateCode: "retreat-lodge",
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
      ...over,
    } as Partial<Business>);

  const checkFor = (b: Business, id: string) =>
    find(
      new VisibilityService().analyze(b, buildBusinessProfile(gloria, b)).checks,
      id,
    );

  it("counts the questions the site actually publishes", () => {
    const faq = checkFor(retreat(), "faq");
    expect(faq.status).not.toBe("fail");
    expect(faq.finding).toContain("FAQPage schema");
  });

  it("does not award full marks for the template's own answers", () => {
    // Published, so not a failure — but generic, and a pass would tell the
    // owner they were done with the highest-value task on the list.
    const faq = checkFor(retreat(), "faq");
    expect(faq.status).toBe("warn");
    expect(faq.recommendation).toContain("your own words");
  });

  it("passes once the owner has written their own", () => {
    const own = retreat({
      content: {
        ...retreat().content,
        faq: {
          heading: { label: "l", title: "t" },
          items: [
            { question: "Wifi?", answer: "Yes, throughout the house." },
            { question: "Parking?", answer: "Space for three cars." },
            { question: "Pets?", answer: "Dogs are welcome downstairs." },
          ],
        },
      },
    } as Partial<Business>);
    const faq = checkFor(own, "faq");
    expect(faq.status).toBe("pass");
    expect(faq.finding).not.toContain("starter");
  });

  it("credits alt text on the photographs the site shows", () => {
    // Same defect as the FAQ: the seeded gallery is fully described, and was
    // being scored as though there were no photographs at all.
    expect(checkFor(retreat(), "image-alt").status).toBe("pass");
  });

  it("falls back to the stored content when no profile could be resolved", () => {
    // A template that fails to load must degrade to the old behaviour rather
    // than take the whole report down.
    const faq = find(
      new VisibilityService().analyze(retreat(), null).checks,
      "faq",
    );
    expect(faq.status).toBe("fail");
  });

  it("reports no map pin until the owner sets one", () => {
    expect(checkFor(retreat(), "coordinates").status).toBe("fail");
    expect(
      checkFor(
        retreat({ latitude: 8.18, longitude: 124.86 } as Partial<Business>),
        "coordinates",
      ).status,
    ).toBe("pass");
  });
});
