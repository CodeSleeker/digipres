import { describe, it, expect } from "vitest";
import { alertContacts } from "@/lib/notifications/booking-notice";
import { updateBusinessSchema } from "@/schemas/business";
import type { Business } from "@/types/business-entity";

const business = (over: Partial<Business> = {}): Business =>
  ({
    name: "Ronie's Barber",
    phone: "0917 111 1111",
    email: "public@shop.test",
    notifyPhone: null,
    notifyEmail: null,
    ...over,
  }) as unknown as Business;

describe("alertContacts", () => {
  it("uses the public details when no alert contacts are set", () => {
    // The migration adds these columns null, so every existing tenant must keep
    // behaving exactly as it did with no backfill and nothing to fill in.
    expect(alertContacts(business())).toEqual({
      phone: "0917 111 1111",
      email: "public@shop.test",
    });
  });

  it("prefers the alert contacts when they are set", () => {
    expect(
      alertContacts(
        business({
          notifyPhone: "0918 222 2222",
          notifyEmail: "owner@personal.test",
        }),
      ),
    ).toEqual({ phone: "0918 222 2222", email: "owner@personal.test" });
  });

  it("overrides each channel independently", () => {
    // The common case: a shared info@ inbox for the website, but texts to the
    // owner's own mobile.
    expect(alertContacts(business({ notifyPhone: "0918 222 2222" }))).toEqual({
      phone: "0918 222 2222",
      email: "public@shop.test",
    });
  });

  it("reports nothing to send to rather than inventing a destination", () => {
    expect(alertContacts(business({ phone: null, email: null }))).toEqual({
      phone: null,
      email: null,
    });
  });
});

describe("clearing contact fields", () => {
  // BusinessRepository.update writes only non-undefined fields, so a blank that
  // parsed to `undefined` would report "saved" and change nothing. Each of
  // these is reachable from the /admin/settings form.
  it("clears a blank phone, email, address and alert contact", () => {
    const parsed = updateBusinessSchema.parse({
      phone: "",
      email: "",
      address: "",
      notifyPhone: "  ",
      notifyEmail: "",
    });
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.address).toBeNull();
    expect(parsed.notifyPhone).toBeNull();
    expect(parsed.notifyEmail).toBeNull();
  });

  it("still leaves omitted fields untouched", () => {
    const parsed = updateBusinessSchema.parse({ phone: "" });
    expect("email" in parsed).toBe(false);
    expect("address" in parsed).toBe(false);
  });

  it("validates an alert email as an email", () => {
    expect(
      updateBusinessSchema.safeParse({ notifyEmail: "not-an-address" }).success,
    ).toBe(false);
    expect(
      updateBusinessSchema.safeParse({ notifyEmail: "owner@shop.test" })
        .success,
    ).toBe(true);
  });
});
