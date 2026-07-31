import { describe, it, expect } from "vitest";
import { updateBusinessSchema } from "@/schemas/business";

/**
 * The business name is now editable from two places — the owner's Contact
 * details page and the platform Business details panel — and both parse it with
 * this same schema, so the rules can't drift between them.
 *
 * It is NOT one of the blank-clears-the-field values: a business with no name
 * would render an empty header, an empty page title and an empty wordmark.
 */
const nameOnly = updateBusinessSchema.pick({ name: true });

describe("business name", () => {
  it("accepts a normal name and trims it", () => {
    expect(nameOnly.parse({ name: "  Ronie's Barber  " }).name).toBe(
      "Ronie's Barber",
    );
  });

  it("REFUSES an empty or whitespace-only name", () => {
    // Unlike phone/email/address, blank here is a mistake rather than an
    // instruction — there is no sensible "no name" state for a business.
    expect(nameOnly.safeParse({ name: "" }).success).toBe(false);
    expect(nameOnly.safeParse({ name: "   " }).success).toBe(false);
  });

  it("caps the length", () => {
    expect(nameOnly.safeParse({ name: "x".repeat(120) }).success).toBe(true);
    expect(nameOnly.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });

  it("leaves the name alone when the field isn't submitted", () => {
    // The platform panel sends only `name`; the owner's form sends several
    // fields. Neither may blank out something it didn't ask about.
    const parsed = updateBusinessSchema.parse({ phone: "0917 111 1111" });
    expect("name" in parsed).toBe(false);
  });

  it("does not accept a slug alongside it by accident", () => {
    // The platform panel picks `name` only on purpose: the slug is the tenant's
    // live URL and must not be changeable from a field beside the name.
    const parsed = nameOnly.parse({
      name: "Ronie's Barber",
      slug: "something-else",
    }) as Record<string, unknown>;
    expect(parsed.slug).toBeUndefined();
  });
});
