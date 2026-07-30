import { describe, it, expect } from "vitest";
import {
  bookingRequestSchema,
  bookingStartsAt,
  isPastDate,
} from "@/schemas/booking";
import {
  bookingEmailSubject,
  bookingEmailText,
  bookingSmsBody,
  type BookingNotice,
} from "@/lib/notifications/booking-notice";
import { resendConfigFromEnv } from "@/lib/email/sender";

const valid = {
  name: "Juan Dela Cruz",
  phone: "0917 123 4567",
  service: "Skin Fade",
  date: "2099-01-15",
  time: "14:30",
};

describe("bookingRequestSchema", () => {
  it("accepts a minimal booking", () => {
    const parsed = bookingRequestSchema.parse(valid);
    expect(parsed.name).toBe("Juan Dela Cruz");
    expect(parsed.barber).toBeUndefined();
  });

  it("requires the fields the owner needs to act on", () => {
    for (const missing of [
      "name",
      "phone",
      "service",
      "date",
      "time",
    ] as const) {
      const payload: Record<string, unknown> = { ...valid };
      delete payload[missing];
      expect(bookingRequestSchema.safeParse(payload).success).toBe(false);
    }
  });

  it("refuses a malformed date rather than coercing it", () => {
    for (const date of ["15/01/2099", "2099-1-5", "tomorrow", ""]) {
      expect(bookingRequestSchema.safeParse({ ...valid, date }).success).toBe(
        false,
      );
    }
  });

  it("refuses an out-of-range or malformed time", () => {
    // "25:00" has the right shape but is not a time — accepting it would build
    // a timestamp the database either rejects or silently rolls over.
    for (const time of ["25:00", "12:60", "2:30", "14:30:00", "2.30pm", ""]) {
      expect(bookingRequestSchema.safeParse({ ...valid, time }).success).toBe(
        false,
      );
    }
  });

  it("accepts the edges of the day", () => {
    for (const time of ["00:00", "09:05", "23:59"]) {
      expect(bookingRequestSchema.safeParse({ ...valid, time }).success).toBe(
        true,
      );
    }
  });

  it("does NOT accept a status, business id or customer id from the caller", () => {
    // Accepting `status` would let a stranger create a 'completed' appointment,
    // which fires the review automation — and outbound SMS — on demand.
    const parsed = bookingRequestSchema.parse({
      ...valid,
      status: "completed",
      businessId: "00000000-0000-0000-0000-000000000000",
      customerId: "00000000-0000-0000-0000-000000000000",
    }) as Record<string, unknown>;
    expect(parsed.status).toBeUndefined();
    expect(parsed.businessId).toBeUndefined();
    expect(parsed.customerId).toBeUndefined();
  });

  it("caps free text so a booking can't be used as bulk storage", () => {
    expect(
      bookingRequestSchema.safeParse({ ...valid, notes: "x".repeat(2001) })
        .success,
    ).toBe(false);
    expect(
      bookingRequestSchema.safeParse({ ...valid, name: "x".repeat(121) })
        .success,
    ).toBe(false);
  });

  it("treats blank optional fields as absent", () => {
    const parsed = bookingRequestSchema.parse({
      ...valid,
      barber: "  ",
      notes: "",
    });
    expect(parsed.barber).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });
});

describe("isPastDate", () => {
  const now = new Date("2099-06-15T12:00:00Z");

  it("rejects yesterday and accepts today and later", () => {
    expect(isPastDate("2099-06-14", now)).toBe(true);
    expect(isPastDate("2099-06-15", now)).toBe(false);
    expect(isPastDate("2099-06-16", now)).toBe(false);
  });

  it("still accepts 'today' for a customer whose clock is ahead of the server", () => {
    // Manila is UTC+8: at 01:00 on the 16th there, the server is still on the
    // 15th. Comparing calendar days keeps that booking valid.
    const serverStillYesterday = new Date("2099-06-15T17:00:00Z");
    expect(isPastDate("2099-06-16", serverStillYesterday)).toBe(false);
  });
});

describe("bookingStartsAt", () => {
  it("stores the customer's wall clock verbatim", () => {
    expect(bookingStartsAt("2099-01-15", "14:30")).toBe(
      "2099-01-15T14:30:00.000Z",
    );
  });

  it("does not depend on the server's timezone", () => {
    // The bug this guards: `new Date("2099-01-15T14:30:00")` with no zone is
    // parsed as SERVER-local time, so the same booking would land on a
    // different instant in every deploy region. The stored value must be a
    // function of the input alone.
    const before = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati"; // UTC+14
      const east = bookingStartsAt("2099-01-15", "14:30");
      process.env.TZ = "Pacific/Midway"; // UTC-11
      expect(bookingStartsAt("2099-01-15", "14:30")).toBe(east);
    } finally {
      process.env.TZ = before;
    }
  });

  it("round-trips through the dashboard's ISO-slicing display", () => {
    // app/admin/appointments/page.tsx renders the time as startsAt.slice(11,16),
    // so what the customer picked is what the owner reads.
    const stored = bookingStartsAt("2099-01-15", "09:05");
    expect(stored.slice(11, 16)).toBe("09:05");
    expect(stored.slice(0, 10)).toBe("2099-01-15");
  });
});

describe("booking notifications", () => {
  const notice: BookingNotice = {
    appointmentId: "abc-123",
    customerName: "Juan Dela Cruz",
    customerPhone: "+639171234567",
    service: "Skin Fade",
    staff: "Ronie",
    date: "2099-01-15",
    time: "14:30",
    notes: "Please keep the sides short.",
  };

  it("puts everything actionable in the SMS", () => {
    const body = bookingSmsBody("Ronie's Barber", notice);
    expect(body).toContain("Juan Dela Cruz");
    expect(body).toContain("+639171234567");
    expect(body).toContain("Skin Fade");
    expect(body).toContain("2099-01-15");
    expect(body).toContain("14:30");
    expect(body).toContain("/admin/appointments/abc-123/edit");
  });

  it("keeps the SMS inside two segments", () => {
    // Every extra segment is charged on every single booking, so length is a
    // cost decision, not a style one.
    const body = bookingSmsBody("Ronie's Barber Shop", notice);
    expect(body.length).toBeLessThanOrEqual(320);
  });

  it("names the customer and the service in the email subject", () => {
    const subject = bookingEmailSubject(notice);
    expect(subject).toContain("Juan Dela Cruz");
    expect(subject).toContain("Skin Fade");
  });

  it("carries the notes and the requested slot in the email", () => {
    const text = bookingEmailText("Ronie's Barber", notice);
    expect(text).toContain("Please keep the sides short.");
    expect(text).toContain("2099-01-15 at 14:30");
  });

  it("says 'Any available' rather than blank when no staff was requested", () => {
    const text = bookingEmailText("Ronie's Barber", { ...notice, staff: null });
    expect(text).toContain("Any available");
  });
});

describe("resendConfigFromEnv", () => {
  it("needs both the key and the from address before it will send", () => {
    // Half-configured must fall back to the logging stub, not throw at runtime
    // in the middle of a customer's booking.
    expect(resendConfigFromEnv({})).toBeNull();
    expect(resendConfigFromEnv({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(resendConfigFromEnv({ EMAIL_FROM: "a@b.co" })).toBeNull();
    expect(
      resendConfigFromEnv({ RESEND_API_KEY: "re_x", EMAIL_FROM: "a@b.co" }),
    ).toEqual({ apiKey: "re_x", from: "a@b.co" });
  });
});
