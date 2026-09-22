import { describe, it, expect } from "vitest";
import {
  tenantSenderAddress,
  tenantSenderName,
} from "@/lib/email/tenant-sender";

/**
 * Who a tenant's mail goes out as.
 *
 * The property under test is the gate. Everything else in this system that
 * touches a From header exists to stop client-edited data choosing the
 * address; this is the one place a tenant address is allowed through, so the
 * conditions have to be exact.
 */

const sender = (over: Record<string, unknown> = {}) =>
  ({
    name: "Elegance by Bem",
    senderFromName: null,
    senderVerified: true,
    senderEnquiryEmail: "hello@elegancebybem.com",
    senderBookingEmail: "booking@elegancebybem.com",
    senderNewsletterEmail: "news@elegancebybem.com",
    ...over,
  }) as never;

describe("tenantSenderAddress", () => {
  it("gives each purpose its own address", () => {
    // The whole reason for migration 0043: enquiries and bookings land in
    // different mailboxes and are read by different people.
    expect(tenantSenderAddress(sender(), "enquiry")).toBe(
      "hello@elegancebybem.com",
    );
    expect(tenantSenderAddress(sender(), "booking")).toBe(
      "booking@elegancebybem.com",
    );
    expect(tenantSenderAddress(sender(), "newsletter")).toBe(
      "news@elegancebybem.com",
    );
  });

  it("REFUSES every address while the domain is unverified", () => {
    // An unverified domain is a domain someone typed. Sending from it would be
    // sending as a domain nobody checked, and the provider would reject it —
    // after the mail had already been composed as the client.
    const unverified = sender({ senderVerified: false });
    for (const purpose of ["enquiry", "booking", "newsletter"] as const) {
      expect(tenantSenderAddress(unverified, purpose)).toBeUndefined();
    }
  });

  it("falls back for a purpose the tenant has not set an address for", () => {
    // Undefined means "use the platform's address". That is the ordinary state
    // of most tenants, not an error.
    expect(
      tenantSenderAddress(sender({ senderBookingEmail: null }), "booking"),
    ).toBeUndefined();
    // And it does not leak another purpose's address to cover the gap.
    expect(
      tenantSenderAddress(sender({ senderBookingEmail: null }), "enquiry"),
    ).toBe("hello@elegancebybem.com");
  });
});

describe("tenantSenderName", () => {
  it("uses the business name when no sender name is set", () => {
    // What every tenant mail used before this existed, so a tenant who never
    // touches the field sees no change.
    expect(tenantSenderName(sender())).toBe("Elegance by Bem");
    expect(tenantSenderName(sender({ senderFromName: "   " }))).toBe(
      "Elegance by Bem",
    );
  });

  it("prefers the sender name when there is one", () => {
    expect(tenantSenderName(sender({ senderFromName: "Bem Events" }))).toBe(
      "Bem Events",
    );
  });
});
