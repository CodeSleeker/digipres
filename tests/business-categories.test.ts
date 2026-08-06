import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BUSINESS_CATEGORIES } from "@/schemas/business";
import { CATEGORY_TYPE } from "@/lib/seo/json-ld";

/**
 * The business category list exists in four places that cannot see each other:
 * a PostgreSQL enum, a TypeScript union generated from it, the Zod list the
 * pickers and the validator share, and the schema.org type map.
 *
 * TypeScript covers two of the joins — the Zod list `satisfies` the union, and
 * the type map is a `Record` over it — but neither can prove the LIST is
 * complete, and neither can see the SQL at all. A category missing from the
 * list is simply never offered; one missing from the migration is offered and
 * then rejected by the database. Both are silent.
 */

describe("business categories", () => {
  it("offers every category the schema.org map knows about, in one order", () => {
    // CATEGORY_TYPE is `Record<BusinessCategory, string>`, so the compiler has
    // already proved its keys are the complete set. That makes it the thing to
    // measure the pickable list against.
    //
    // Order, not just membership: the migration places new values to match this
    // sequence, so all three readings of the list — the picker, the type map and
    // `\dT+` against the database — agree line for line.
    expect([...BUSINESS_CATEGORIES]).toEqual(Object.keys(CATEGORY_TYPE));
  });

  it("matches the enum the database will actually accept", () => {
    // Read the migrations rather than a mirror of them: the point is to catch a
    // list that has moved on without a migration, and any in-repo copy of the
    // enum would move with the list.
    const sql = [
      "supabase/migrations/0001_create_businesses.sql",
      "supabase/migrations/0032_business_category_bakery.sql",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    for (const category of BUSINESS_CATEGORIES) {
      expect(sql, `no migration adds '${category}'`).toContain(`'${category}'`);
    }
  });

  it("keeps the catch-all last so pickers read sensibly", () => {
    expect(BUSINESS_CATEGORIES[BUSINESS_CATEGORIES.length - 1]).toBe("other");
  });

  it("gives a bakery its own schema.org type, not a cafe's", () => {
    // The whole reason the category was added: a cake studio published as a
    // CafeOrCoffeeShop tells search engines it sells coffee to drink in.
    expect(CATEGORY_TYPE.bakery).toBe("Bakery");
    expect(CATEGORY_TYPE.bakery).not.toBe(CATEGORY_TYPE.cafe);
  });
});
