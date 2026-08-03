import { describe, it, expect } from "vitest";
import { leadSchema } from "@/schemas/lead";
import {
  alertDestinations,
  alertEmailFor,
  leadEmailSubject,
  leadEmailText,
  leadSmsBody,
} from "@/lib/notifications/lead-notice";
import { smsSegments, isGsm7 } from "@/lib/sms/gsm7";
import type { NewLead } from "@/schemas/lead";

const base = {
  kind: "contact" as const,
  name: "Juan Dela Cruz",
  email: "juan@example.com",
};

describe("leadSchema", () => {
  it("accepts a minimal enquiry", () => {
    expect(leadSchema.safeParse(base).success).toBe(true);
  });

  it("requires a name and a usable email", () => {
    expect(leadSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });

  it("turns blank optionals into null rather than empty strings", () => {
    const parsed = leadSchema.parse({
      ...base,
      phone: "",
      projectType: "   ",
      message: "",
    });
    expect(parsed.phone).toBeNull();
    expect(parsed.projectType).toBeNull();
    expect(parsed.message).toBeNull();
  });

  it("caps every field to the database CHECK limits", () => {
    // A payload the DB would reject must fail here first, with a message.
    expect(leadSchema.safeParse({ ...base, name: "x".repeat(121) }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, phone: "9".repeat(33) }).success).toBe(false);
    expect(
      leadSchema.safeParse({ ...base, message: "x".repeat(4001) }).success,
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(leadSchema.safeParse({ ...base, kind: "spam" }).success).toBe(false);
  });

  it("carries the honeypot through so the action can discard on it", () => {
    const parsed = leadSchema.parse({ ...base, company: "bot corp" });
    expect(parsed.company).toBe("bot corp");
  });
});

describe("alert destinations", () => {
  const full = {
    PLATFORM_ALERT_EMAIL: "hello@aliamz.com",
    PLATFORM_BOOKING_EMAIL: "bookings@aliamz.com",
    PLATFORM_ALERT_PHONE: "+639171234567",
    PLATFORM_SMS_SENDER_ID: "Aliamz",
  };

  it("reads every platform var", () => {
    expect(alertDestinations(full)).toEqual({
      bookingEmail: "bookings@aliamz.com",
      contactEmail: "hello@aliamz.com",
      phone: "+639171234567",
      senderId: "Aliamz",
    });
  });

  it("routes consultations and enquiries to different inboxes", () => {
    expect(alertEmailFor("consultation", full)).toBe("bookings@aliamz.com");
    expect(alertEmailFor("contact", full)).toBe("hello@aliamz.com");
  });

  it("falls back to the general inbox when no booking inbox is set", () => {
    // A misconfigured booking address must still reach a human, not nowhere.
    const env = { PLATFORM_ALERT_EMAIL: "hello@aliamz.com" };
    expect(alertEmailFor("consultation", env)).toBe("hello@aliamz.com");
    expect(alertEmailFor("contact", env)).toBe("hello@aliamz.com");
  });

  it("does NOT fall back the other way", () => {
    // Only a booking inbox configured: general enquiries must not be quietly
    // diverted into it.
    const env = { PLATFORM_BOOKING_EMAIL: "bookings@aliamz.com" };
    expect(alertEmailFor("consultation", env)).toBe("bookings@aliamz.com");
    expect(alertEmailFor("contact", env)).toBeNull();
  });

  it("treats unset and blank alike, so a channel is simply off", () => {
    expect(alertDestinations({})).toEqual({
      bookingEmail: null,
      contactEmail: null,
      phone: null,
      senderId: null,
    });
    expect(
      alertDestinations({ PLATFORM_ALERT_EMAIL: "  ", PLATFORM_ALERT_PHONE: "" }),
    ).toMatchObject({ contactEmail: null, bookingEmail: null, phone: null });
  });
});

describe("lead alerts", () => {
  const consultation: NewLead = {
    kind: "consultation",
    name: "Maria Cristina Dela Cruz-Santos",
    email: "maria@example.com",
    phone: "+639171234567",
    projectType: "IoT solution",
    preferredDate: "2026-08-10",
    preferredTime: "14:30",
    message: "We have 40 delivery vans to track.",
    sourceIp: "1.2.3.4",
  };

  it("names the kind and the person in the subject", () => {
    expect(leadEmailSubject(consultation)).toBe(
      "New consultation request: Maria Cristina Dela Cruz-Santos",
    );
  });

  it("puts every detail in the email body", () => {
    const text = leadEmailText(consultation);
    for (const part of [
      "maria@example.com",
      "+639171234567",
      "IoT solution",
      "2026-08-10 at 14:30",
      "40 delivery vans",
    ]) {
      expect(text).toContain(part);
    }
  });

  it("omits consultation-only fields from a plain enquiry", () => {
    const text = leadEmailText({
      ...consultation,
      kind: "contact",
      projectType: null,
      preferredDate: null,
      preferredTime: null,
    });
    expect(text).not.toContain("Preferred");
    expect(text).toContain("New enquiry from the website.");
  });

  describe("SMS alert", () => {
    it("costs exactly one credit, even with a long name", () => {
      // This fires on every enquiry; a second segment is a second charge.
      const body = leadSmsBody(consultation);
      expect(smsSegments(body)).toMatchObject({
        encoding: "GSM-7",
        segments: 1,
      });
    });

    it("stays one credit with a hostile name", () => {
      const body = leadSmsBody({
        ...consultation,
        name: "Ronie’s Barbería & Grooming Lounge International Incorporated",
      });
      expect(smsSegments(body).segments).toBe(1);
    });

    it("contains no character that would force UCS-2, even from hostile input", () => {
      expect(isGsm7(leadSmsBody(consultation))).toBe(true);
      expect(
        isGsm7(leadSmsBody({ ...consultation, name: "Ronie’s Barbería — 💈" })),
      ).toBe(true);
    });

    it("points at the email instead of repeating it", () => {
      // The detail is already in the inbox; duplicating it here costs segments.
      const body = leadSmsBody(consultation);
      expect(body).toMatch(/email/i);
      expect(body).not.toContain("maria@example.com");
      expect(body).not.toContain("delivery vans");
    });
  });
});
