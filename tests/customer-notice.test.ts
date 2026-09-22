import { describe, it, expect } from "vitest";
import {
  bookingConfirmedEmailSubject,
  bookingConfirmedEmailText,
  bookingConfirmedSms,
  bookingReceivedEmailSubject,
  bookingReceivedEmailText,
  emailCustomerBookingConfirmed,
  emailCustomerBookingReceived,
  bookingReceivedSms,
  canTextCustomer,
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingReceived,
  type CustomerBookingNotice,
} from "@/lib/notifications/customer-notice";
import { updateBusinessSchema } from "@/schemas/business";

const notice: CustomerBookingNotice = {
  businessName: "Ronie's Barber",
  customerName: "Juan Dela Cruz",
  service: "Skin Fade",
  date: "2099-01-15",
  time: "14:30",
};

describe("canTextCustomer", () => {
  it("texts a valid, subscribed number", () => {
    expect(
      canTextCustomer({ mobile: "+639171234567", smsStatus: "not_sent" }),
    ).toBe(true);
  });

  it("REFUSES a number that replied STOP", () => {
    // Opt-out is keyed by phone number across every tenant
    // (features/sms/opt-out.ts). Honouring it is not optional.
    expect(
      canTextCustomer({ mobile: "+639171234567", smsStatus: "opted_out" }),
    ).toBe(false);
  });

  it("refuses a missing or non-E.164 number rather than letting the carrier reject it", () => {
    expect(canTextCustomer({ mobile: null, smsStatus: null })).toBe(false);
    expect(canTextCustomer({ mobile: "0917 123 4567", smsStatus: null })).toBe(
      false,
    );
    expect(canTextCustomer({ mobile: "", smsStatus: null })).toBe(false);
  });
});

describe("the tenant's customer-SMS switch", () => {
  const subscribed = { mobile: "+639171234567", smsStatus: "not_sent" };
  const optedOut = { mobile: "+639171234567", smsStatus: "opted_out" };

  it("reports 'disabled' when the tenant switched customer texts off", async () => {
    // Distinct from 'skipped' so the booking log says WHICH reason applied.
    await expect(
      notifyCustomerBookingReceived(
        { notifyCustomerSms: false },
        subscribed,
        notice,
      ),
    ).resolves.toBe("disabled");
  });

  it("still refuses an opted-out customer when the switch is ON", async () => {
    // The switch is a spending control, not a consent override. Both must pass.
    await expect(
      notifyCustomerBookingConfirmed(
        { notifyCustomerSms: true },
        optedOut,
        notice,
      ),
    ).resolves.toBe("skipped");
  });

  it("never sends when the switch is off, whatever the customer's status", async () => {
    for (const customer of [subscribed, optedOut]) {
      await expect(
        notifyCustomerBookingConfirmed(
          { notifyCustomerSms: false },
          customer,
          notice,
        ),
      ).resolves.not.toBe("sent");
    }
  });
});

describe("bookingReceivedSms", () => {
  it("sets the expectation that this is not yet a confirmation", () => {
    const body = bookingReceivedSms(notice);
    expect(body).toContain("request");
    expect(body).toMatch(/confirm/i);
    // The customer must not read this as "you're booked".
    expect(body).not.toMatch(/\bCONFIRMED\b/);
  });

  it("carries the slot and the shop", () => {
    const body = bookingReceivedSms(notice);
    expect(body).toContain("Ronie's Barber");
    expect(body).toContain("2099-01-15");
    expect(body).toContain("14:30");
    expect(body).toContain("Skin Fade");
  });

  it("uses the first name only", () => {
    expect(bookingReceivedSms(notice)).toContain("Hi Juan,");
    expect(bookingReceivedSms(notice)).not.toContain("Juan Dela Cruz");
  });

  it("reads correctly with no service chosen", () => {
    const body = bookingReceivedSms({ ...notice, service: null });
    expect(body).not.toContain("for  ");
    expect(body).toContain("2099-01-15");
  });
});

describe("parsing the toggle out of a form", () => {
  it("accepts the explicit true/false the form submits", () => {
    expect(
      updateBusinessSchema.parse({ notifyCustomerSms: "false" })
        .notifyCustomerSms,
    ).toBe(false);
    expect(
      updateBusinessSchema.parse({ notifyCustomerSms: "true" })
        .notifyCustomerSms,
    ).toBe(true);
  });

  it("accepts a native checkbox 'on' too", () => {
    expect(
      updateBusinessSchema.parse({ notifyCustomerSms: "on" }).notifyCustomerSms,
    ).toBe(true);
  });

  it("leaves the column alone for an omitted or unrecognised value", () => {
    // The dangerous failure would be coercing junk to `false` and silently
    // disabling a tenant's customer texts.
    const omitted = updateBusinessSchema.parse({});
    expect("notifyCustomerSms" in omitted).toBe(false);
    expect(
      updateBusinessSchema.parse({ notifyCustomerSms: "maybe" })
        .notifyCustomerSms,
    ).toBeUndefined();
  });
});

describe("bookingConfirmedSms", () => {
  it("says plainly that it is confirmed", () => {
    const body = bookingConfirmedSms(notice);
    expect(body).toContain("CONFIRMED");
    expect(body).toContain("2099-01-15");
    expect(body).toContain("14:30");
  });

  it("stays within two SMS segments", () => {
    // Charged per segment, per customer, on every booking — length is a cost
    // decision. A long business name is the realistic worst case.
    const body = bookingConfirmedSms({
      ...notice,
      businessName: "Ronie's Premium Barber & Grooming Lounge",
      service: "Hair & Scalp Treatment",
    });
    expect(body.length).toBeLessThanOrEqual(320);
  });

  it("handles a one-word name", () => {
    expect(bookingConfirmedSms({ ...notice, customerName: "Juan" })).toContain(
      "Hi Juan,",
    );
  });
});

/**
 * The same two moments, in writing.
 *
 * Email is a SECOND channel, not a replacement: the text reaches someone in a
 * queue, the mail is the copy they still have next week. What matters most
 * here is that the RECEIVED mail does not read like a confirmation — the owner
 * has accepted nothing yet, and a mail that says otherwise is the one that
 * makes somebody turn up to a slot nobody kept for them.
 */
describe("customer booking email", () => {
  const business = (over: Record<string, unknown> = {}) =>
    ({
      name: "Ronie's Barber",
      senderFromName: null,
      senderVerified: false,
      senderEnquiryEmail: null,
      senderBookingEmail: null,
      senderNewsletterEmail: null,
      notifyEmail: "shop@example.ph",
      email: null,
      ...over,
    }) as never;

  it("does not call a request a confirmation", () => {
    const text = bookingReceivedEmailText(notice);
    expect(text).toMatch(/not a confirmed booking/i);
    expect(bookingReceivedEmailSubject(notice)).not.toMatch(/confirmed/i);
  });

  it("says confirmed only once it is", () => {
    expect(bookingConfirmedEmailSubject(notice)).toMatch(/^Confirmed:/);
    expect(bookingConfirmedEmailText(notice)).toMatch(/is confirmed/i);
  });

  it("carries the what and the when in both", () => {
    for (const text of [
      bookingReceivedEmailText(notice),
      bookingConfirmedEmailText(notice),
    ]) {
      expect(text).toContain("Skin Fade");
      expect(text).toContain("2099-01-15");
      expect(text).toContain("14:30");
    }
  });

  it("greets by first name, like the texts do", () => {
    expect(bookingReceivedEmailText(notice)).toContain("Hi Juan,");
    expect(bookingReceivedEmailText(notice)).not.toContain("Juan Dela Cruz");
  });

  it("skips silently when no address was given", async () => {
    // Optional by design (schemas/booking.ts): demanding one would turn people
    // away at the last field. No address is the ordinary case, not a failure.
    await expect(
      emailCustomerBookingReceived(business(), { email: null }, notice),
    ).resolves.toBe("skipped");
  });

  it("sends when there is one", async () => {
    await expect(
      emailCustomerBookingConfirmed(
        business(),
        { email: "juan@example.ph" },
        notice,
      ),
    ).resolves.toBe("sent");
  });
});
