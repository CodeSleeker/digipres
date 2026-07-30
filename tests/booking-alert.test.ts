import { describe, it, expect } from "vitest";
import { bookingAlertBody } from "@/lib/notifications/booking-alert";

/**
 * The desktop notification body, built from the raw appointments row Supabase
 * Realtime delivers — so every field has to be treated as possibly absent.
 */
describe("bookingAlertBody", () => {
  it("names the service and the slot", () => {
    expect(
      bookingAlertBody({
        service: "Skin Fade",
        starts_at: "2099-01-15T14:30:00.000Z",
      }),
    ).toBe("Skin Fade · 2099-01-15 at 14:30");
  });

  it("reads the stored wall clock rather than converting it", () => {
    // Appointment times are the customer's wall clock pinned to UTC. Parsing
    // through Date would render 14:30 as some other number in the viewer's
    // zone and disagree with every other screen in the admin.
    const body = bookingAlertBody({
      service: "Cut",
      starts_at: "2099-01-15T14:30:00.000Z",
    });
    expect(body).toContain("14:30");
  });

  it("falls back when the service is missing or blank", () => {
    expect(
      bookingAlertBody({ service: null, starts_at: "2099-01-15T09:00:00.000Z" }),
    ).toBe("New appointment · 2099-01-15 at 09:00");
    expect(
      bookingAlertBody({ service: "   ", starts_at: "2099-01-15T09:00:00.000Z" }),
    ).toBe("New appointment · 2099-01-15 at 09:00");
  });

  it("drops the slot rather than printing a broken one", () => {
    expect(bookingAlertBody({ service: "Cut", starts_at: null })).toBe("Cut");
    expect(bookingAlertBody({ service: "Cut", starts_at: "2099-01" })).toBe(
      "Cut",
    );
  });

  it("survives an empty row", () => {
    expect(bookingAlertBody({})).toBe("New appointment");
  });
});
