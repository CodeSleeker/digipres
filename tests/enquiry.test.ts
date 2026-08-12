import { describe, it, expect } from "vitest";
import { enquiryRequestSchema } from "@/schemas/enquiry";
import {
  enquirySmsBody,
  enquiryEmailSubject,
  enquiryEmailText,
} from "@/lib/notifications/enquiry-notice";
import { isGsm7, smsSegments } from "@/lib/sms/gsm7";

/**
 * A question asked of a tenant.
 *
 * The whole reason this exists separately from a booking is that a question has
 * no date — and forcing one would file it in the owner's calendar, count it
 * towards the pending-bookings badge, and drop it into the path the review
 * automation reads. See migration 0036.
 */

const payload = (over: Record<string, unknown> = {}) => ({
  name: "Ana Cruz",
  email: "ana@example.ph",
  message: "Is there wifi, and can we bring a dog?",
  slug: "gloria",
  ...over,
});

describe("enquiry request schema", () => {
  it("accepts a question with no date, no time and no service", () => {
    // The three fields the bookings endpoint requires and a question cannot
    // supply. This is the gap the endpoint exists to close.
    const result = enquiryRequestSchema.safeParse(payload());
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("accepts an email address or a mobile number, either alone", () => {
    expect(enquiryRequestSchema.safeParse(payload()).success).toBe(true);
    expect(
      enquiryRequestSchema.safeParse(
        payload({ email: undefined, phone: "0917 123 4567" }),
      ).success,
    ).toBe(true);
  });

  it("refuses a question nobody can answer", () => {
    // Mirrors the database's own constraint rather than trusting it: failing
    // here gives the visitor a message on the field instead of a 500.
    const result = enquiryRequestSchema.safeParse(
      payload({ email: undefined, phone: undefined }),
    );
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toMatch(
      /email address or a mobile number/i,
    );
  });

  it("treats an untouched input as absent, not as empty", () => {
    // A blank string arrives from a field the visitor never typed in; it must
    // not count as "they gave an email" and defeat the check above.
    const result = enquiryRequestSchema.safeParse(
      payload({ email: "  ", phone: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("requires something to have been asked", () => {
    expect(enquiryRequestSchema.safeParse(payload({ message: "   " })).success)
      .toBe(false);
  });

  it("refuses a malformed email rather than storing a dead reply route", () => {
    expect(
      enquiryRequestSchema.safeParse(payload({ email: "ana@" })).success,
    ).toBe(false);
  });

  it("never accepts a business id or read state from the caller", () => {
    // Both are set server-side. An enquiry always arrives unread, and its
    // tenant comes from the request host.
    const parsed = enquiryRequestSchema.parse(
      payload({ business_id: "someone-else", read_at: new Date().toISOString() }),
    );
    expect(parsed).not.toHaveProperty("business_id");
    expect(parsed).not.toHaveProperty("read_at");
  });
});

/**
 * The owner's SMS, which has to stay in ONE 160-character GSM-7 segment — one
 * credit. The same three rules that keep the booking alert to one segment apply
 * here, and the test is what stops a well-meaning edit undoing them.
 */
describe("enquiry SMS", () => {
  const notice = {
    enquiryId: "e1",
    name: "Ana Cruz",
    email: "ana@example.ph",
    phone: "0917 123 4567",
    topic: "Amenities",
    message: "Is there wifi, and can we bring a dog?",
  };

  it("stays inside one GSM-7 segment", () => {
    const body = enquirySmsBody("Gloria's Dahilayan", notice);
    expect(isGsm7(body)).toBe(true);
    expect(smsSegments(body).segments).toBe(1);
  });

  it("stays inside one segment when every field is over-long", () => {
    // The values are typed by a stranger. Without clipping, one long name
    // silently adds a credit to every message the owner receives.
    const body = enquirySmsBody("A".repeat(80), {
      ...notice,
      name: "B".repeat(80),
      phone: "C".repeat(60),
      message: "D".repeat(500),
    });
    expect(smsSegments(body).segments).toBe(1);
  });

  it("carries a way to reply, preferring the number", () => {
    expect(enquirySmsBody("Gloria's", notice)).toContain("0917 123 4567");
    expect(
      enquirySmsBody("Gloria's", { ...notice, phone: null }),
    ).toContain("ana@example.ph");
  });

  it("uses no em dash — the character that tripled the booking alert", () => {
    expect(enquirySmsBody("Gloria's", notice)).not.toContain("—");
  });
});

describe("enquiry email", () => {
  const notice = {
    enquiryId: "e1",
    name: "Ana Cruz",
    email: "ana@example.ph",
    phone: null,
    topic: null,
    message: "How far is the zipline?",
  };

  it("names the asker in the subject", () => {
    expect(enquiryEmailSubject(notice)).toBe("New question from Ana Cruz");
  });

  it("adds the topic when there is one", () => {
    expect(enquiryEmailSubject({ ...notice, topic: "Getting here" })).toBe(
      "New question from Ana Cruz: Getting here",
    );
  });

  it("says which reply routes are missing rather than leaving a blank", () => {
    const text = enquiryEmailText("Gloria's", notice);
    expect(text).toContain("Email: ana@example.ph");
    expect(text).toContain("Phone: not given");
    expect(text).toContain("How far is the zipline?");
  });
});
