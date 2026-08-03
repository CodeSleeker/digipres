import { describe, it, expect } from "vitest";
import { FIELDS } from "@/features/business/form-fields";
import { createBusinessSchema } from "@/schemas/business";

/**
 * `readForm` filters incoming FormData through an allow-list before Zod sees
 * it. That is the right shape — a crafted POST must not be able to set a column
 * the form does not offer — but it has one nasty failure mode:
 *
 *   a field added to the schema and forgotten in the list is DROPPED SILENTLY.
 *
 * Nothing errors. The update is a partial, so Zod is satisfied by its absence,
 * the repository skips the undefined key, the form reports success, and the
 * value never changes. That is exactly how `wordmarkUrl` shipped broken.
 *
 * This test is the guard: every scalar field the schema accepts must be
 * reachable through the form.
 */

/** Handled explicitly in `readForm` because they arrive as JSON, not strings. */
const JSON_FIELDS = new Set(["hours", "brand"]);

/**
 * Schema fields the OWNER deliberately cannot set from their back office.
 *
 * Listing them here rather than letting the sweep below ignore anything it
 * doesn't recognise: an omission has to be a decision someone wrote down, not
 * an accident that happens to pass.
 */
const PLATFORM_ONLY = new Map([
  [
    "smsSenderId",
    "Registered with the SMS carrier per business and set at /platform/businesses/<id>. " +
      "An owner changing it would silently start getting their texts rejected.",
  ],
]);

describe("business form allow-list", () => {
  const schemaKeys = Object.keys(createBusinessSchema.shape);

  it("accepts every scalar field the schema defines", () => {
    const missing = schemaKeys.filter(
      (key) =>
        !JSON_FIELDS.has(key) &&
        !PLATFORM_ONLY.has(key) &&
        !FIELDS.includes(key as never),
    );
    expect(missing).toEqual([]);
  });

  it("keeps platform-only fields out of the owner's form", () => {
    // The other direction of the same rule: these must NOT become settable
    // from the client back office by someone adding them to the list.
    for (const key of PLATFORM_ONLY.keys()) {
      expect(FIELDS).not.toContain(key);
    }
  });

  it("does not allow a key the schema would reject", () => {
    // The reverse drift: a stale entry here is dead weight at best, and at
    // worst names a column that no longer exists.
    const unknown = FIELDS.filter((key) => !schemaKeys.includes(key));
    expect(unknown).toEqual([]);
  });

  it("includes the branding image fields specifically", () => {
    // Named rather than left to the sweep above, because these are the ones a
    // client notices immediately and reports as "it didn't save".
    for (const key of ["logoUrl", "wordmarkUrl", "faviconUrl", "coverImageUrl"]) {
      expect(FIELDS).toContain(key);
    }
  });
});
