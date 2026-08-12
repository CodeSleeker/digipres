import { describe, it, expect } from "vitest";
import { messengerLink } from "@/templates/retreat/lodge/lib/messenger";
import { gloria } from "@/lib/businesses/gloria";
import { templateFields } from "@/templates/registry";
import { bookingRequestSchema } from "@/schemas/booking";

/**
 * The retreat's stay enquiry.
 *
 * The template used to have no route to the owner at all: its two CTA buttons
 * pointed at an anchor on the same page, and `ctaBanner` is not editable, so an
 * owner could not even correct them. The form posts to the same public intake
 * the other two templates use, so an enquiry becomes a customer, an appointment
 * and an SMS + email to the owner.
 */

describe("stay enquiry payload", () => {
  /** What the form sends, as it builds it. */
  const payload = (over: Record<string, unknown> = {}) => ({
    name: "Ana Cruz",
    phone: "0917 123 4567",
    service: "Weekend stay",
    date: "2026-09-04",
    // The conventional check-in hour: a stay has a date, not a minute.
    time: "14:00",
    notes: "Departure: 2026-09-06\nGuests: 4\nEmail: ana@example.com",
    slug: "gloria",
    ...over,
  });

  it("satisfies the endpoint's own schema", () => {
    // The form is not the boundary — /api/bookings re-parses everything. This
    // pins that what it sends actually gets through that parse.
    const result = bookingRequestSchema.safeParse(payload());
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("sends an arrival time the schema accepts", () => {
    // "14:00" is a convention, not a guess — but the schema's hour/minute
    // ranges are strict, so a change here has to stay valid.
    const parsed = bookingRequestSchema.parse(payload());
    expect(parsed.time).toBe("14:00");
  });

  it("carries the departure, party size and email the schema has no column for", () => {
    // These are the three things a stay enquiry is actually about. Dropping
    // them to fit the shared shape would leave the owner an arrival date and a
    // name.
    const parsed = bookingRequestSchema.parse(payload());
    expect(parsed.notes).toContain("Departure: 2026-09-06");
    expect(parsed.notes).toContain("Guests: 4");
    expect(parsed.notes).toContain("ana@example.com");
  });

  it("still parses when the optional details are left out", () => {
    // Name, number and arrival are the only fields the form requires.
    const result = bookingRequestSchema.safeParse(
      payload({ notes: "", service: "Stay enquiry" }),
    );
    expect(result.success).toBe(true);
  });
});

describe("enquiry options", () => {
  it("declares the dropdown it now renders", () => {
    // The form has a "what kind of stay" select, so the CMS must offer the
    // owner the choices — and still not offer staff routing, which a
    // whole-property let has no use for.
    const fields = templateFields("retreat-lodge");
    expect(fields.bookingOptions).toBe(true);
    expect(fields.staffOptions).toBeFalsy();
  });

  it("seeds choices for the dropdown, and no staff", () => {
    expect(gloria.contact.serviceOptions.length).toBeGreaterThan(0);
    expect(gloria.contact.barberOptions).toEqual([]);
  });
});

describe("messenger link", () => {
  /*
   * Why this exists: Meta can only deliver a message to someone who has
   * messaged the Page first, so notifying the OWNER through Messenger is not
   * possible. A visitor writing to the Page is — and that is what makes
   * Facebook notify the owner. So the link has to actually open a conversation.
   */
  it("opens a conversation for a vanity page", () => {
    expect(messengerLink("https://www.facebook.com/gloriasdahilayan")).toBe(
      "https://m.me/gloriasdahilayan",
    );
    expect(messengerLink("https://facebook.com/some.page")).toBe(
      "https://m.me/some.page",
    );
  });

  it("falls back to the page itself when there is no username to use", () => {
    // A numeric id has nothing m.me can open, but the page still has a Message
    // button on it — better than dropping the link entirely.
    const numeric = "https://www.facebook.com/profile.php?id=61550000000000";
    expect(messengerLink(numeric)).toBe(numeric);

    const nested = "https://www.facebook.com/pages/Some-Place/123456";
    expect(messengerLink(nested)).toBe(nested);
  });

  it("renders nothing for a tenant who has set no Facebook page", () => {
    // The button is dropped rather than pointed somewhere plausible — the same
    // rule the footer's social icons follow.
    expect(messengerLink(undefined)).toBeNull();
    expect(messengerLink("")).toBeNull();
  });

  it("refuses a link that isn't Facebook at all", () => {
    // Guessing a Messenger handle from an unrelated domain would send visitors
    // somewhere the owner never nominated.
    expect(messengerLink("https://instagram.com/gloriasdahilayan")).toBeNull();
    expect(messengerLink("not a url")).toBeNull();
  });

  it("is derived from the tenant's own column, never from template content", () => {
    // The seed ships no socials — they come from the business record, so an
    // un-configured tenant gets no button instead of a demo one.
    expect(gloria.footer.socials).toEqual([]);
  });
});
