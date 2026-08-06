// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * THE SAVE MUST NOT EAT ANYTHING.
 *
 * Each CMS form renders only the inputs the tenant's template declares
 * (templates/registry → `fields`), and a save writes the whole section back.
 * That combination has one dangerous failure: a value behind an input the form
 * chose not to render is silently dropped, and the owner discovers it as a
 * blank strip on their live site — after doing the most ordinary thing in a
 * CMS, which is opening a form and pressing Save without typing anything.
 *
 * These tests do exactly that, for every section of both templates, and assert
 * the payload is the content that went in. They are the reason the per-template
 * `fields` mechanism can be trusted; the rest of the suite can only check the
 * declarations agree with each other, not that the form honours them.
 *
 * The server actions are mocked at the boundary the form actually crosses —
 * `useCmsSubmit` serializes to `content` and calls the action — so what is
 * captured here is byte-for-byte what would reach the database.
 */

const saved = new Map<string, unknown>();

function capture(section: string) {
  return vi.fn(async (fd: FormData) => {
    saved.set(section, JSON.parse(String(fd.get("content"))));
    return { success: true };
  });
}

vi.mock("@/features/website-cms/actions", () => ({
  saveHero: capture("hero"),
  saveAbout: capture("about"),
  saveServices: capture("services"),
  saveProducts: capture("products"),
  saveGallery: capture("gallery"),
  saveTestimonials: capture("testimonials"),
  saveFaq: capture("faq"),
  saveContact: capture("contact"),
  saveFooter: capture("footer"),
  saveBarbers: capture("barbers"),
  saveSocialLinks: capture("socials"),
}));

import { HeroForm } from "@/app/admin/website/_forms/hero-form";
import { AboutForm } from "@/app/admin/website/_forms/about-form";
import { ServicesForm } from "@/app/admin/website/_forms/services-form";
import { ProductsForm } from "@/app/admin/website/_forms/products-form";
import { GalleryForm } from "@/app/admin/website/_forms/gallery-form";
import { arah } from "@/lib/businesses/arah";
import { ronies } from "@/lib/businesses/ronies";
import { templateFields } from "@/templates/registry";
import type { BusinessProfile } from "@/types/business";

const patisserie = templateFields("patisserie-boutique");
const barber = templateFields("barber-luxury");

beforeEach(() => saved.clear());
afterEach(() => cleanup());

/** Press Save and wait for the action to have run. */
async function save(section: string) {
  await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
  await waitFor(() => expect(saved.has(section)).toBe(true));
  return saved.get(section);
}

/**
 * Compare against the section as the SCHEMA would store it, not against the
 * profile object: the schema legitimately normalises (blank strings become
 * undefined, blank list rows are dropped), and JSON drops undefined entirely.
 * Round-tripping the expectation through the same JSON both sides go through
 * keeps the comparison about loss, not about representation.
 */
function asStored(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * `toMatchObject`, not `toEqual`, and the difference is the whole point.
 *
 * The property under test is that NOTHING IS LOST. A save is allowed to make an
 * implicit value explicit — an unchecked checkbox arrives as `stroke: false`
 * where the content had simply omitted it — and that is not a defect: it means
 * the same thing to every template and to the schema. What would be a defect is
 * a value going in and not coming out, and `toMatchObject` fails on exactly
 * that while tolerating the added key.
 *
 * Array lengths must still match, so a dropped list item is caught.
 */
function expectNoLoss(stored: unknown, original: unknown) {
  expect(stored).toMatchObject(asStored(original) as object);
}

describe("CMS forms — an untouched save changes nothing", () => {
  describe.each([
    ["patisserie-boutique", arah, patisserie],
    ["barber-luxury", ronies, barber],
  ] as const)("%s", (code, profile: BusinessProfile, fields) => {
    it("hero", async () => {
      render(
        <HeroForm defaultValues={profile.hero} fields={fields} businessId={null} />,
      );
      expectNoLoss(await save("hero"), profile.hero);
    });

    it("about", async () => {
      render(
        <AboutForm
          defaultValues={profile.about}
          fields={fields}
          businessId={null}
        />,
      );
      expectNoLoss(await save("about"), profile.about);
    });

    it("services", async () => {
      render(
        <ServicesForm
          defaultValues={profile.services}
          fields={fields}
          businessId={null}
        />,
      );
      expectNoLoss(await save("services"), profile.services);
    });

    it("products", async () => {
      render(
        <ProductsForm
          defaultValues={profile.products}
          fields={fields}
          businessId={null}
        />,
      );
      expectNoLoss(await save("products"), profile.products);
    });

    it("gallery", async () => {
      render(
        <GalleryForm
          defaultValues={profile.gallery}
          fields={fields}
          businessId={null}
        />,
      );
      expectNoLoss(await save("gallery"), profile.gallery);
    });
  });
});

describe("CMS forms — the per-template inputs", () => {
  it("offers a photograph and serving note on a menu, an icon on a service", async () => {
    const { unmount } = render(
      <ServicesForm
        defaultValues={arah.services}
        fields={patisserie}
        businessId={null}
      />,
    );
    expect(screen.getAllByLabelText(/photograph/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/serving note/i).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/icon/i)).toBeNull();
    unmount();

    render(
      <ServicesForm
        defaultValues={ronies.services}
        fields={barber}
        businessId={null}
      />,
    );
    expect(screen.getAllByLabelText(/icon/i).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/photograph/i)).toBeNull();
    expect(screen.queryByLabelText(/serving note/i)).toBeNull();
  });

  it("offers the proof strip and availability card only to a photo hero", () => {
    const { unmount } = render(
      <HeroForm defaultValues={arah.hero} fields={patisserie} businessId={null} />,
    );
    expect(screen.getByText(/proof strip/i)).toBeTruthy();
    expect(screen.getByText(/availability card/i)).toBeTruthy();
    // The scrub hero's video field belongs to the other template.
    expect(screen.queryByText(/stats/i)).toBeNull();
    unmount();

    render(
      <HeroForm defaultValues={ronies.hero} fields={barber} businessId={null} />,
    );
    expect(screen.getByText(/stats/i)).toBeTruthy();
    expect(screen.queryByText(/proof strip/i)).toBeNull();
    expect(screen.queryByText(/availability card/i)).toBeNull();
  });

  it("offers a heading link only where the design places one", () => {
    const { unmount } = render(
      <GalleryForm
        defaultValues={arah.gallery}
        fields={patisserie}
        businessId={null}
      />,
    );
    expect(screen.getByText(/heading link/i)).toBeTruthy();
    unmount();

    render(
      <GalleryForm
        defaultValues={ronies.gallery}
        fields={barber}
        businessId={null}
      />,
    );
    expect(screen.queryByText(/heading link/i)).toBeNull();
  });
});

describe("CMS forms — an edit still lands", () => {
  it("saves a changed title without disturbing the hidden fields", async () => {
    render(
      <ServicesForm
        defaultValues={arah.services}
        fields={patisserie}
        businessId={null}
      />,
    );

    const title = screen.getByDisplayValue("Pistachio Rose Cake");
    await userEvent.clear(title);
    await userEvent.type(title, "Pistachio & Rose Cake");

    const stored = (await save("services")) as typeof arah.services;
    expect(stored.items[0]!.title).toBe("Pistachio & Rose Cake");
    // Everything the form never showed is still there.
    expect(stored.items[0]!.image).toBe(arah.services.items[0]!.image);
    expect(stored.heading.link?.label).toBe("See the full menu");
  });
});
