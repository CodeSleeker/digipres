import { describe, it, expect } from "vitest";
import { gloria } from "@/lib/businesses/gloria";
import { ronies } from "@/lib/businesses/ronies";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { journalSchema } from "@/schemas/website-content";
import { SECTION_COLUMN, type WebsiteContent } from "@/types/website-content";
import { templateSections } from "@/templates/registry";
import type { Business } from "@/types/business-entity";
import type { JournalContent } from "@/types/website-content";

/**
 * The journal section.
 *
 * It differs from every other section in two ways that need pinning: it has NO
 * fallback to the template default (an empty save hides it, rather than
 * restoring someone else's entries), and it is dated — so the date has to be a
 * real one, and the order has to come from the date rather than from the order
 * an owner happened to type things in.
 */

const entry = (over: Partial<JournalContent["items"][number]> = {}) => ({
  date: "2026-08-02",
  title: "The mornings have turned",
  text: "The cool has settled in early this year.",
  images: [],
  ...over,
});

const business = (content: Partial<WebsiteContent> = {}): Business =>
  ({
    slug: "tenant",
    name: "Tenant",
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
      journal: null,
      products: null,
      testimonials: null,
      faq: null,
      contact: null,
      footer: null,
      ...content,
    },
  }) as unknown as Business;

describe("journal storage", () => {
  it("has a column to be stored in", () => {
    expect(SECTION_COLUMN.journal).toBe("journal_content");
  });

  it("accepts an entry with no photographs", () => {
    // The common case: an owner writing a line from their phone.
    const parsed = journalSchema.parse({
      heading: { label: "From the house", title: "Notes" },
      items: [entry()],
    });
    expect(parsed.items[0]!.images).toEqual([]);
  });

  it("accepts an empty list, which is how the section is removed", () => {
    // Every other section refuses this — an empty save there would publish a
    // blank strip. Here it is the only way an owner can take the journal down.
    const parsed = journalSchema.parse({
      heading: { label: "From the house", title: "Notes" },
      items: [],
    });
    expect(parsed.items).toEqual([]);
  });

  it("refuses a date that never happened", () => {
    // The shape is right and the month is real, so a regex alone lets this
    // through — and it would sort into the wrong place and print as an invalid
    // date on a live site.
    expect(journalSchema.safeParse({
      heading: { label: "l", title: "t" },
      items: [entry({ date: "2026-02-31" })],
    }).success).toBe(false);

    expect(journalSchema.safeParse({
      heading: { label: "l", title: "t" },
      items: [entry({ date: "12/08/2026" })],
    }).success).toBe(false);
  });

  it("refuses alt text that only repeats the caption", () => {
    // Same rule as the gallery: the caption is already printed under the
    // photograph, so repeating it describes nothing while letting the field
    // count as filled in.
    const result = journalSchema.safeParse({
      heading: { label: "l", title: "t" },
      items: [
        entry({
          images: [
            { src: "/a.jpg", caption: "The deck", alt: "the deck" },
          ],
        }),
      ],
    });
    expect(result.success).toBe(false);
  });

  it("caps an entry at four photographs", () => {
    const images = Array.from({ length: 5 }, (_, i) => ({
      src: `/p${i}.jpg`,
      alt: `A photograph numbered ${i}`,
      caption: `Photo ${i}`,
    }));
    expect(journalSchema.safeParse({
      heading: { label: "l", title: "t" },
      items: [entry({ images })],
    }).success).toBe(false);
  });

  it("drops a blank caption rather than storing an empty line", () => {
    const parsed = journalSchema.parse({
      heading: { label: "l", title: "t" },
      items: [
        entry({
          images: [{ src: "/a.jpg", caption: "  ", alt: "A quiet deck at dusk" }],
        }),
      ],
    });
    expect(parsed.items[0]!.images[0]!.caption).toBeUndefined();
  });
});

describe("journal merge", () => {
  it("falls back to the template default until the owner writes their own", () => {
    // What makes the seeded entries worth shipping: an untouched tenant still
    // renders the section. The safety is in the content of that default, not
    // in this merge — see the note in build-profile.
    const profile = buildBusinessProfile(gloria, business());
    expect(profile.journal?.items).toHaveLength(gloria.journal!.items.length);
  });

  it("lets an owner remove the section by clearing the list", () => {
    /*
     * The distinction the fallback turns on: `null` is "never customized" and
     * inherits, while a STORED empty list is a decision and does not. Without
     * this an owner could never take the journal down — every save would be
     * undone by the default.
     */
    const profile = buildBusinessProfile(
      gloria,
      business({ journal: { heading: { label: "l", title: "t" }, items: [] } }),
    );
    expect(profile.journal?.items).toEqual([]);
  });

  it("uses the tenant's own entries when they have some", () => {
    const stored: JournalContent = {
      heading: { label: "Latest", title: "This week" },
      items: [entry({ title: "Ours" })],
    };
    const profile = buildBusinessProfile(gloria, business({ journal: stored }));
    expect(profile.journal?.items[0]!.title).toBe("Ours");
  });

  it("drops the nav link when there is nothing to jump to", () => {
    // A static nav entry would otherwise give a tenant who has emptied their
    // journal an anchor that scrolls nowhere — the defect the FAQ link had.
    expect(gloria.nav.some((n) => n.href === "#journal")).toBe(true);

    const emptied = buildBusinessProfile(
      gloria,
      business({ journal: { heading: { label: "l", title: "t" }, items: [] } }),
    );
    expect(emptied.nav.some((n) => n.href === "#journal")).toBe(false);

    const filled = buildBusinessProfile(
      gloria,
      business({
        journal: { heading: { label: "l", title: "t" }, items: [entry()] },
      }),
    );
    expect(filled.nav.some((n) => n.href === "#journal")).toBe(true);
  });

  it("drops the link for a template with no journal at all", () => {
    // `journal` is optional on the profile; a template that never had one must
    // not be given an anchor by the filter's own optional chaining.
    const profile = buildBusinessProfile(ronies, business());
    expect(profile.journal).toBeUndefined();
    expect(profile.nav.some((n) => n.href === "#journal")).toBe(false);
  });

  it("still drops the FAQ link independently", () => {
    // The two filters were merged into one pass; this pins that neither ate the
    // other.
    const profile = buildBusinessProfile(ronies, business());
    expect(profile.nav.some((n) => n.href === "#faq")).toBe(false);
  });
});

describe("journal on the retreat template", () => {
  it("is offered by the template that renders it, and no other", () => {
    expect(templateSections("retreat-lodge")).toContain("journal");
    expect(templateSections("barber-luxury")).not.toContain("journal");
    expect(templateSections("patisserie-boutique")).not.toContain("journal");
  });

  it("ships entries that validate against the schema the CMS saves through", () => {
    const result = journalSchema.safeParse(gloria.journal);
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("describes every seeded photograph", () => {
    for (const item of gloria.journal!.items) {
      for (const image of item.images) {
        expect(image.alt, item.title).toBeTruthy();
        expect(image.alt!.toLowerCase()).not.toBe(
          image.caption?.toLowerCase() ?? "",
        );
      }
    }
  });

  it("sorts newest first from the dates, not from the stored order", () => {
    // What the template does at render. Written oldest-last here on purpose:
    // an owner adding a missed entry should not have to drag it into place.
    const sorted = [...gloria.journal!.items].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    expect(sorted.map((i) => i.date)).toEqual(
      [...gloria.journal!.items.map((i) => i.date)].sort().reverse(),
    );
    expect(sorted[0]!.date >= sorted[sorted.length - 1]!.date).toBe(true);
  });

  it("leaves the other templates without a journal at all", () => {
    expect(ronies.journal).toBeUndefined();
  });
});
