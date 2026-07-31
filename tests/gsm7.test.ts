import { describe, it, expect } from "vitest";
import { clipForSms, isGsm7, smsSegments, toGsm7 } from "@/lib/sms/gsm7";
import { bookingSmsBody } from "@/lib/notifications/booking-notice";
import {
  bookingConfirmedSms,
  bookingReceivedSms,
} from "@/lib/notifications/customer-notice";

describe("isGsm7", () => {
  it("accepts plain ASCII", () => {
    expect(isGsm7("New booking - Ronies Barber")).toBe(true);
  });

  it("accepts the accented letters GSM-7 actually has", () => {
    expect(isGsm7("Café Ñuñez Öl")).toBe(true);
  });

  it("rejects an em dash — the character that tripled the booking alert", () => {
    expect(isGsm7("New booking — Ronies")).toBe(false);
  });

  it("rejects a curly apostrophe, which phones produce by default", () => {
    expect(isGsm7("Ronie’s Barber")).toBe(false);
  });
});

describe("toGsm7", () => {
  it("leaves an already-safe body untouched", () => {
    const body = "Hi Juan, your booking is CONFIRMED. See you!";
    expect(toGsm7(body)).toBe(body);
  });

  it("converts the punctuation that forces UCS-2", () => {
    expect(toGsm7("a — b – c ‐ d")).toBe("a - b - c - d");
    expect(toGsm7("Ronie’s ‘shop’ “here”")).toBe(`Ronie's 'shop' "here"`);
    expect(toGsm7("wait…")).toBe("wait...");
  });

  it("normalizes invisible characters that cost a full encoding switch", () => {
    expect(toGsm7("a b")).toBe("a b"); // non-breaking space
    expect(toGsm7("a​b")).toBe("ab"); // zero-width space
  });

  it("spells out the peso sign a Philippine shop name may carry", () => {
    expect(toGsm7("₱500 off")).toBe("PHP500 off");
  });

  it("keeps accented letters that ARE in GSM-7 rather than flattening them", () => {
    expect(toGsm7("Café")).toBe("Café");
    expect(toGsm7("Ñuñez")).toBe("Ñuñez");
  });

  it("strips diacritics from letters GSM-7 lacks", () => {
    expect(toGsm7("Barbería")).toBe("Barberia");
    expect(toGsm7("açaí")).toBe("acai");
  });

  it("drops what has no Latin form rather than paying triple for it", () => {
    expect(toGsm7("Ronies 💈 Barber")).toBe("Ronies  Barber");
  });

  it("always produces something GSM-7 encodable", () => {
    for (const input of [
      "Ronie’s Barbería — 💈 ₱500",
      "日本語のみ",
      "a b…c–d",
    ]) {
      expect(isGsm7(toGsm7(input))).toBe(true);
    }
  });
});

describe("smsSegments", () => {
  it("counts one GSM-7 segment up to 160 characters", () => {
    expect(smsSegments("a".repeat(160))).toMatchObject({
      encoding: "GSM-7",
      segments: 1,
    });
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
  });

  it("counts one UCS-2 segment up to only 70 characters", () => {
    // The whole problem in one assertion: same length, 2.3x the cost.
    const ascii = "a".repeat(120);
    expect(smsSegments(ascii).segments).toBe(1);
    expect(smsSegments(`—${ascii.slice(1)}`).segments).toBe(2);
  });

  it("charges extension-table characters two septets", () => {
    expect(smsSegments("€").units).toBe(2);
  });

  it("counts an astral character as two UCS-2 units", () => {
    expect(smsSegments("💈").units).toBe(2);
  });
});

describe("clipForSms", () => {
  it("passes a short value through", () => {
    expect(clipForSms("Ronies Barber", 24)).toBe("Ronies Barber");
  });

  it("cuts at a word boundary when one is available", () => {
    expect(clipForSms("The Extremely Long Barbershop Name", 24)).toBe(
      "The Extremely Long",
    );
  });

  it("hard-cuts when honouring the boundary would throw most of it away", () => {
    expect(clipForSms("Ab Supercalifragilistic", 12)).toBe("Ab Supercali");
  });

  it("collapses whitespace so a pasted name cannot pad the body", () => {
    expect(clipForSms("  Ronies   Barber  ", 24)).toBe("Ronies Barber");
  });
});

/**
 * The regression that started all this: a single booking cost 5 credits.
 * These pin every routine message at ONE, including with hostile-length and
 * hostile-encoding tenant data.
 */
describe("booking messages cost one credit", () => {
  const NASTY = {
    // Long, curly-apostrophed, accented, emoji'd — everything a client can type.
    business: "Ronie’s Barbería & Grooming Lounge 💈",
    customer: "Maria Cristina Dela Cruz-Santos",
    service: "Haircut & Beard Trim with Hot Towel",
    staff: "Kuya Ronie Bautista",
  };

  function credits(body: string) {
    return smsSegments(toGsm7(body)).segments;
  }

  it("owner alert stays at one credit even with worst-case data", () => {
    const body = bookingSmsBody(NASTY.business, {
      appointmentId: "0d2916b3-db1f-46ac-95d6-2cdcadc5c26e",
      customerName: NASTY.customer,
      customerPhone: "+639171234567",
      service: NASTY.service,
      staff: NASTY.staff,
      date: "2026-08-01",
      time: "14:30",
      notes: null,
    });
    expect(credits(body)).toBe(1);
    // The dashboard URL was half the old message; it must not creep back in.
    expect(body).not.toMatch(/https?:\/\//);
  });

  it("customer 'received' stays at one credit", () => {
    expect(
      credits(
        bookingReceivedSms({
          businessName: NASTY.business,
          customerName: NASTY.customer,
          service: NASTY.service,
          date: "2026-08-01",
          time: "14:30",
        }),
      ),
    ).toBe(1);
  });

  it("customer 'confirmed' stays at one credit", () => {
    expect(
      credits(
        bookingConfirmedSms({
          businessName: NASTY.business,
          customerName: NASTY.customer,
          service: NASTY.service,
          date: "2026-08-01",
          time: "14:30",
        }),
      ),
    ).toBe(1);
  });

  it("no booking template contains a non-GSM-7 character", () => {
    // Catches an em dash or smart quote reintroduced by an editor or a paste.
    const plain = {
      businessName: "Shop",
      customerName: "Juan",
      service: "Haircut",
      date: "2026-08-01",
      time: "14:30",
    };
    expect(isGsm7(bookingReceivedSms(plain))).toBe(true);
    expect(isGsm7(bookingConfirmedSms(plain))).toBe(true);
    expect(
      isGsm7(
        bookingSmsBody("Shop", {
          appointmentId: "x",
          customerName: "Juan",
          customerPhone: "+639171234567",
          service: "Haircut",
          staff: null,
          date: "2026-08-01",
          time: "14:30",
          notes: null,
        }),
      ),
    ).toBe(true);
  });
});
