import { describe, it, expect, vi, afterEach } from "vitest";
import { bem } from "@/lib/businesses/bem";
import { findTemplate, templateFields } from "@/templates/registry";
import { sectionSchema } from "@/schemas/website-content";
import { SECTION_COLUMN } from "@/types/website-content";
import type { WebsiteSection } from "@/types/website-content";
import { themePalette } from "@/templates/themes";
import {
  composeMessage,
  validateInquiry,
  submitInquiry,
  type EventInquiry,
} from "@/templates/events/elegance/lib/inquiry";

/**
 * The events template's own invariants.
 *
 * The generic registry tests already prove it has a palette and that its
 * sections are storable. What is left is specific to this one: it is the first
 * template whose gallery is DERIVED (the filter chips come from the events
 * themselves), and the first with an enquiry form that has to hold together
 * before any backend exists.
 */

const template = findTemplate("events-elegance");
const fields = templateFields("events-elegance");

describe("events/elegance registration", () => {
  it("is registered with a theme and a palette", () => {
    expect(template).not.toBeNull();
    expect(template!.themes.length).toBeGreaterThan(0);
    // Not the gold-on-black fallback: that would mean no palette was added.
    expect(themePalette("events-elegance", "default").background).toBe(
      "#faf8f4",
    );
  });

  it("offers every section it renders, and none it doesn't", () => {
    // No team, shop, gallery or journal. The portfolio strip and the event
    // grid are the template's OWN content (`EventsSections`), not the shared
    // gallery section, so offering `gallery` would give an owner a form whose
    // photographs never reach the page.
    //
    // `faq` IS offered: the questions are published as FAQPage structured
    // data, which is the format answer engines quote from — and Google's
    // policy requires that markup to match content visible on the page, so
    // the section renders them too.
    expect(template!.sections).toEqual([
      // First, beside Branding: the template's own blocks aren't an ordinary
      // page section. Everything after runs top-to-bottom down the page.
      "events",
      "hero",
      "services",
      "about",
      "testimonials",
      "faq",
      // Their own menus since migration 0044. They used to be one key inside
      // the events content, which put "what my booking form asks" under a
      // heading about photographs.
      "enquiry",
      "booking",
      "contact",
      "footer",
    ]);
  });

  it("stores its own blocks in their own column", () => {
    // Migration 0041. Without the mapping the CMS would write nowhere and
    // report success.
    expect(SECTION_COLUMN.events).toBe("events_content");
  });

  it("validates its own default content against the section schemas", () => {
    // Every declared section's default must survive the schema the CMS saves
    // through — otherwise an owner's first save of an untouched form fails.
    for (const section of template!.sections) {
      const result = sectionSchema(section, fields).safeParse(
        defaultFor(section),
      );
      expect(
        result.success,
        `${section}: ${JSON.stringify(result.error)}`,
      ).toBe(true);
    }
  });

  it("is not offered the inputs its page has nowhere to draw", () => {
    /*
     * The contact heading and the newsletter box. This template's contact
     * area is a CTA banner, not a headed section, and its footer has no
     * column for a sign-up — so an owner asked for that copy would type a
     * headline and a paragraph that appear nowhere on their site.
     */
    expect(fields.contactHeading).toBeFalsy();
    expect(fields.footerNewsletter).toBeFalsy();
  });

  it("declares no pricing and no booking options", () => {
    // An event is quoted after a conversation, and the enquiry form's
    // dropdowns come from `events.inquiry` — so the shared booking options
    // would be answers an owner types and the form never shows.
    expect(fields.itemPricing).toBeFalsy();
    expect(fields.bookingOptions).toBeFalsy();
    expect(fields.staffOptions).toBeFalsy();

    for (const item of bem.services.items) {
      expect(item.price).toBeFalsy();
      expect(item.unit).toBeFalsy();
    }
    expect(bem.contact.serviceOptions).toEqual([]);
    expect(bem.contact.barberOptions).toEqual([]);
  });
});

describe("events/elegance default content", () => {
  it("carries its own sections", () => {
    expect(bem.events).toBeDefined();
    expect(bem.events!.portfolio.items.length).toBeGreaterThan(0);
    expect(bem.events!.showcase.items.length).toBeGreaterThan(0);
    expect(bem.services.approach!.stats!.length).toBeGreaterThan(0);
  });

  it("gives every portfolio card a filter that matches a real category", () => {
    // A card whose filter names a category no event carries would scroll to a
    // grid and change nothing — the failure is silent, which is why it is
    // asserted rather than watched for.
    const categories = new Set(
      bem.events!.showcase.items.map((item) => item.category.trim()),
    );
    for (const card of bem.events!.portfolio.items) {
      if (!card.filter) continue;
      expect(categories, `portfolio card "${card.title}"`).toContain(
        card.filter,
      );
    }
  });

  it("offers the six filters the brief asks for", () => {
    // Derived, not configured: the chips ARE the categories in the grid, so
    // this asserts the seed content produces the set that was asked for.
    const categories = new Set(
      bem.events!.showcase.items.map((item) => item.category),
    );
    expect([...categories].sort()).toEqual([
      "Birthdays",
      "Corporate",
      "Debuts",
      "Other Events",
      "Weddings",
    ]);
    expect(bem.events!.showcase.allLabel).toBeTruthy();
  });

  it("keeps the footer's small print in its own field, not a column", () => {
    // It used to be a footer column titled "Legal" that SiteFooter lifted out
    // of the grid by matching the title — so renaming it in the CMS moved the
    // links with no warning. A named field is a thing the form can label, and
    // it belongs on the footer an owner is editing.
    expect(bem.footer.legal!.length).toBeGreaterThan(0);
    expect(
      bem.footer.columns.some((c) => /^legal$/i.test(c.title)),
      "the magic column is gone",
    ).toBe(false);
  });

  it("has a diallable phone number for the closing banner", () => {
    // The banner renders the phone link only for a line that classifies as a
    // number; a malformed default would silently drop the control.
    const lines = bem.contact.details.flatMap((d) => d.lines);
    expect(lines.some((line) => /^\+?\(?\d[\d\s()+-]{6,}$/.test(line))).toBe(
      true,
    );
  });
});

describe("enquiry", () => {
  const valid: EventInquiry = {
    name: "Ana Cruz",
    phone: "+63 917 555 0142",
    email: "",
    eventType: "Wedding",
    eventDate: "",
    venue: "",
    guests: "",
    budget: "",
    services: [],
    theme: "",
    details: "",
  };

  it("accepts a name, one way to reply and an event type", () => {
    expect(validateInquiry(valid)).toBeNull();
    expect(
      validateInquiry({ ...valid, phone: "", email: "ana@example.com" }),
    ).toBeNull();
  });

  it("refuses an enquiry nobody can be replied to", () => {
    expect(validateInquiry({ ...valid, phone: "", email: "" })).toMatch(
      /contact number or an email/i,
    );
  });

  it("refuses a missing name or event type", () => {
    expect(validateInquiry({ ...valid, name: "  " })).toMatch(/name/i);
    expect(validateInquiry({ ...valid, eventType: "" })).toMatch(/kind of/i);
  });

  it("refuses a date in the past but allows today", () => {
    /*
     * Built from LOCAL calendar parts, not `toISOString().slice(0, 10)`.
     *
     * That was the old helper, and it is how this test caught a real bug: at
     * 00:00 in UTC+8, `toISOString()` reports yesterday's date, so the test
     * asked "is yesterday allowed today?" — and the answer was correctly no.
     * The same mismatch in `validateInquiry` rejected TODAY for every visitor
     * west of UTC.
     */
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);

    expect(validateInquiry({ ...valid, eventDate: iso(today) })).toBeNull();
    expect(validateInquiry({ ...valid, eventDate: iso(yesterday) })).toMatch(
      /future/i,
    );
  });

  it("allows today in every timezone, not just east of UTC", () => {
    // The bug this replaced: a date-only string parses as UTC midnight while
    // the clock is local, so New York's "today" looked five hours past.
    for (const offset of [-720, -300, 0, 330, 480, 840]) {
      const now = new Date();
      const local = new Date(now.getTime() - offset * 60_000);
      const day = `${local.getUTCFullYear()}-${String(
        local.getUTCMonth() + 1,
      ).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
      // Whatever the offset, a day at or after the runner's own today passes.
      if (day >= iso0()) {
        expect(
          validateInquiry({ ...valid, eventDate: day }),
          `offset ${offset}`,
        ).toBeNull();
      }
    }
  });

  it("refuses a body the endpoint would reject anyway", () => {
    // The limit is checked on the COMPOSED message, not the textarea, because
    // the labelled lines count towards it too.
    expect(validateInquiry({ ...valid, details: "x".repeat(4001) })).toMatch(
      /too long/i,
    );
  });
});

describe("enquiry composition", () => {
  const full: EventInquiry = {
    name: "Ana Cruz",
    phone: "+63 917 555 0142",
    email: "",
    eventType: "Wedding",
    eventDate: "2026-11-14",
    venue: "The Peninsula Manila",
    guests: "300",
    budget: "Over 1,000,000",
    services: ["Full event styling", "Florals and decor"],
    theme: "Ivory and gold",
    details: "We would like an outdoor ceremony if the weather holds.",
  };

  it("carries every field the enquiries table has no column for", () => {
    // The point of composing: six answers the schema cannot hold, which would
    // otherwise be collected from the client and silently dropped.
    const message = composeMessage(full);
    for (const fragment of [
      "2026-11-14",
      "The Peninsula Manila",
      "300",
      "Over 1,000,000",
      "Full event styling",
      "Ivory and gold",
      "outdoor ceremony",
    ]) {
      expect(message, fragment).toContain(fragment);
    }
  });

  it("omits the answers that were left blank", () => {
    // A column of "Venue: —" teaches the owner nothing and pushes what the
    // client actually wrote off the inbox card.
    const message = composeMessage({ ...full, venue: "", guests: "" });
    expect(message).not.toContain("Venue:");
    expect(message).not.toContain("Guests:");
    expect(message).toContain("Date:");
  });

  it("still produces a body when only the required fields were filled", () => {
    // Every field but the name and the event type is optional by design, and
    // the endpoint requires a non-empty message — so the shortest honest
    // enquiry the form offers must not be rejected.
    const message = composeMessage({
      ...full,
      eventDate: "",
      venue: "",
      guests: "",
      budget: "",
      services: [],
      theme: "",
      details: "",
    });
    expect(message.trim().length).toBeGreaterThan(0);
  });
});

describe("enquiry submission", () => {
  afterEach(() => vi.unstubAllGlobals());

  const valid: EventInquiry = {
    name: "Ana Cruz",
    phone: "+63 917 555 0142",
    email: "",
    eventType: "Wedding",
    eventDate: "",
    venue: "",
    guests: "",
    budget: "",
    services: [],
    theme: "",
    details: "",
  };

  /**
   * `json` resolves, because the code under test chains `.catch()` onto it —
   * a stub returning a bare object passes a shape fetch never produces and
   * would prove nothing about the real path.
   */
  function stubFetch({ ok, json }: { ok: boolean; json: unknown }) {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok, json: () => Promise.resolve(json) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { origin: "https://example.test" } });
    return fetchMock;
  }

  it("posts to the platform's own intake, with the slug for the apex path", async () => {
    const fetchMock = stubFetch({
      ok: true,
      json: { ok: true, reference: "ENQ-3F7A-92C1" },
    });

    const result = await submitInquiry(valid, "bem");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.test/api/enquiries");

    const body = JSON.parse((init as RequestInit).body as string);
    // `topic` is the event type: the column exists, so it is not buried in
    // the message where the inbox cannot show it beside the name.
    expect(body.topic).toBe("Wedding");
    expect(body.slug).toBe("bem");
    expect(body.message.length).toBeGreaterThan(0);
    // Blank means "not given" to the endpoint's schema, not empty string.
    expect(body.email).toBeUndefined();
    expect(result.reference).toBe("ENQ-3F7A-92C1");
  });

  it("returns no reference rather than inventing one", async () => {
    // A browser holding this page while an older deployment answers. Printing
    // "undefined" as somebody's reference is worse than offering none.
    stubFetch({ ok: true, json: { ok: true } });
    expect((await submitInquiry(valid, "bem")).reference).toBeNull();
  });

  it("surfaces the endpoint's own refusal", async () => {
    // The rate limiter explains itself to the visitor ("Please call us
    // instead"); replacing that with a generic line loses the explanation.
    stubFetch({
      ok: false,
      json: { error: "Too many messages right now." },
    });
    await expect(submitInquiry(valid, "bem")).rejects.toThrow(
      /Too many messages/,
    );
  });
});

/**
 * The stored shape of one section's template default.
 *
 * Contact and footer keep only their non-scalar half; the rest is derived
 * from the business's own columns at render time, so feeding the whole
 * rendered section to the schema would fail on fields the CMS never stores.
 */
function defaultFor(section: WebsiteSection): unknown {
  switch (section) {
    case "contact":
      return {
        label: bem.contact.label,
        titleLines: bem.contact.titleLines,
        intro: bem.contact.intro,
        serviceOptions: bem.contact.serviceOptions,
        barberOptions: bem.contact.barberOptions,
      };
    case "footer":
      return {
        description: bem.footer.description,
        columns: bem.footer.columns,
        copyright: bem.footer.copyright,
        credit: bem.footer.credit,
      };
    default:
      return bem[
        section as "hero" | "about" | "services" | "testimonials" | "events"
      ];
  }
}

/** The runner's own local today, as the validator computes it. */
function iso0(): string {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
