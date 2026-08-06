import { describe, it, expect } from "vitest";
import { buildBusinessProfile } from "@/lib/website/build-profile";
import { ronies } from "@/lib/businesses/ronies";
import { loadTemplate, TEMPLATES } from "@/templates/registry";
import type { Business } from "@/types/business-entity";

/**
 * The rendered profile must carry the TENANT's slug, never the template
 * default's.
 *
 * A template's `defaultProfile` is a real profile (lib/businesses/ronies.ts is
 * both the barber/luxury default and the first client's site), and
 * buildBusinessProfile spreads it. `slug` used to survive that spread, so every
 * barber/luxury tenant reported slug "ronies". Nobody noticed, because that WAS
 * the first client's slug — the bug and the truth agreed until they were
 * renamed to "ronnie-barbershop", at which point every site on the template
 * started advertising a slug that no longer exists.
 *
 * Not cosmetic: templates/barber/luxury/sections/contact.tsx posts
 * `business.slug` as the tenant hint for requests whose HOST doesn't identify a
 * tenant — i.e. the apex path /s/<slug>, which is live. A stale slug there
 * routes a real booking to the wrong business or to none.
 */

const business = (over: Partial<Business> = {}): Business =>
  ({
    slug: "ronnie-barbershop",
    name: "Ronnie Barbershop",
    hours: [],
    address: null,
    phone: null,
    facebookUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    googleReviewUrl: null,
    content: {
      hero: null,
      about: null,
      services: null,
      barbers: null,
      gallery: null,
      products: null,
      testimonials: null,
      contact: null,
      footer: null,
    },
    ...over,
  }) as unknown as Business;

describe("profile slug", () => {
  it("uses the tenant's slug, not the template default's", () => {
    // The exact production case: the default profile still says "ronies".
    expect(ronies.slug).toBe("ronies");
    expect(buildBusinessProfile(ronies, business()).slug).toBe(
      "ronnie-barbershop",
    );
  });

  it("does not fall back to the default when the tenant is renamed again", () => {
    const profile = buildBusinessProfile(ronies, business({ slug: "new-name" }));
    expect(profile.slug).toBe("new-name");
  });

  /*
   * The timeout is generous because `loadTemplate` dynamically imports a whole
   * template — every section, hook and component — and the cost grows with each
   * one added to the registry. Under a parallel run that transform work is
   * contended, and the default 5s starts failing on the work rather than on the
   * assertion.
   */
  it(
    "holds for every registered template's default profile",
    async () => {
      // The trap is structural, not specific to barber/luxury: any template
      // whose default is a real client's profile carries a real slug into the
      // spread.
      for (const { code } of TEMPLATES) {
        const template = await loadTemplate(code);
        const profile = buildBusinessProfile(
          template.defaultProfile,
          business({ slug: "tenant-slug" }),
        );
        expect(profile.slug, `template ${code}`).toBe("tenant-slug");
      }
    },
    30_000,
  );
});
