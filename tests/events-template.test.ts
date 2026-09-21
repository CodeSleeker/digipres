import { describe, it, expect } from "vitest";
import { bem } from "@/lib/businesses/bem";
import { findTemplate, templateFields } from "@/templates/registry";
import { themePalette } from "@/templates/themes";
import {
  makeReference,
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
    // No team, shop, gallery, journal or FAQ. The portfolio strip and the
    // event grid are the template's OWN content (`EventsSections`), not the
    // shared gallery section, so offering `gallery` would give an owner a form
    // whose photographs never reach the page.
    expect(template!.sections).toEqual([
      "hero",
      "services",
      "about",
      "testimonials",
      "contact",
      "footer",
    ]);
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
    expect(bem.events!.approach.stats.length).toBeGreaterThan(0);
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

  it("keeps a Legal column for the footer's bottom rule", () => {
    // SiteFooter lifts a column titled "Legal" out of the grid. Rename it and
    // the links quietly move into the grid instead.
    const legal = bem.footer.columns.find((c) => /^legal$/i.test(c.title));
    expect(legal?.links.length).toBeGreaterThan(0);
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
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const yesterday = new Date(today.getTime() - 86_400_000);

    expect(validateInquiry({ ...valid, eventDate: iso(today) })).toBeNull();
    expect(validateInquiry({ ...valid, eventDate: iso(yesterday) })).toMatch(
      /future/i,
    );
  });

  it("mints a dated reference with no ambiguous characters", () => {
    const reference = makeReference(new Date("2026-03-09T00:00:00Z"));
    expect(reference).toMatch(
      /^EB-260309-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/,
    );
  });

  it("returns a reference from the placeholder submit", async () => {
    // The seam a backend replaces. It must already resolve with something the
    // success state can print, or the form's finished state is untested until
    // the day the endpoint lands.
    const result = await submitInquiry(valid);
    expect(result.reference).toMatch(/^EB-/);
  });
});
