import { describe, it, expect } from "vitest";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  imageUploadError,
  tenantImageObjectKey,
} from "@/lib/security/media";
import { gallerySchema } from "@/schemas/website-content";
import { isSafeImageUrl } from "@/lib/security/css";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * CMS photos are owner-supplied — uploaded from a phone or pasted as a link —
 * and end up on the public site. These pin the boundary rules.
 */

describe("tenantImageObjectKey — the tenancy boundary", () => {
  it("puts the business id FIRST, which is what the RLS policy keys on", () => {
    // Migration 0019 checks (storage.foldername(name))[1] against
    // owns_business(). Changing this shape silently breaks upload authorization.
    const key = tenantImageObjectKey("biz-1", "image/jpeg", "abc");
    expect(key.split("/")[0]).toBe("biz-1");
    expect(key).toBe("biz-1/images/abc.jpg");
  });

  it("takes the extension from the content type, never the filename", () => {
    // A file named "cut.jpg.exe" must not get to dictate the stored key.
    expect(tenantImageObjectKey("b", "image/png", "id")).toBe(
      "b/images/id.png",
    );
    expect(tenantImageObjectKey("b", "image/webp", "id")).toBe(
      "b/images/id.webp",
    );
    expect(tenantImageObjectKey("b", "image/avif", "id")).toBe(
      "b/images/id.avif",
    );
  });

  it("falls back to a safe extension for an unexpected type", () => {
    expect(tenantImageObjectKey("b", "application/x-msdownload", "id")).toBe(
      "b/images/id.jpg",
    );
  });

  it("is unique per upload, so a gallery can hold many photos", () => {
    // Unlike the hero video's fixed slot, gallery items are reordered and
    // removed — there is no stable key to overwrite.
    expect(tenantImageObjectKey("b", "image/jpeg", "one")).not.toBe(
      tenantImageObjectKey("b", "image/jpeg", "two"),
    );
  });
});

describe("imageUploadError", () => {
  it("passes an ordinary phone photo", () => {
    expect(imageUploadError({ type: "image/jpeg", size: 3_000_000 })).toBeNull();
  });

  it("rejects a file that isn't an accepted image", () => {
    expect(imageUploadError({ type: "application/pdf", size: 100 })).toMatch(
      /JPG/,
    );
  });

  it("refuses SVG — it can carry script", () => {
    expect(ACCEPTED_IMAGE_TYPES).not.toContain("image/svg+xml");
    expect(imageUploadError({ type: "image/svg+xml", size: 100 })).toBeTruthy();
  });

  it("rejects an oversized file", () => {
    expect(
      imageUploadError({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }),
    ).toMatch(/too large/);
  });
});

describe("an uploaded photo survives the render path", () => {
  const uploaded =
    "https://abc.supabase.co/storage/v1/object/public/tenant-media/biz-1/images/abc.jpg";

  it("passes the CMS image validator", () => {
    // The stored URL flows into a CSS url(...) in places, so it must clear the
    // breakout check as well as the schema.
    expect(isSafeImageUrl(uploaded)).toBe(true);
  });

  it("is optimizable, so next/image doesn't throw on it", () => {
    expect(isOptimizableSrc(uploaded)).toBe(true);
  });

  it("is accepted by the gallery schema", () => {
    const parsed = gallerySchema.parse({
      heading: { label: "Our Work", title: "GALLERY" },
      items: [{ title: "FADE", by: "By Ronie", image: uploaded }],
    });
    expect(parsed.items[0]!.image).toBe(uploaded);
  });
});

describe("gallery caption", () => {
  const base = {
    heading: { label: "Our Work", title: "GALLERY" },
    items: [
      { title: "FADE", by: "By Ronie", image: "https://x.example/a.jpg" },
    ],
  };

  it("is optional", () => {
    expect(gallerySchema.parse(base).items[0]!.caption).toBeUndefined();
  });

  it("is kept when provided", () => {
    const parsed = gallerySchema.parse({
      ...base,
      items: [{ ...base.items[0]!, caption: "Happy client — fresh skin fade" }],
    });
    expect(parsed.items[0]!.caption).toBe("Happy client — fresh skin fade");
  });

  it("normalises blank to undefined so no empty line renders", () => {
    const parsed = gallerySchema.parse({
      ...base,
      items: [{ ...base.items[0]!, caption: "   " }],
    });
    expect(parsed.items[0]!.caption).toBeUndefined();
  });

  it("is length-bounded — it sits in a small overlay", () => {
    expect(() =>
      gallerySchema.parse({
        ...base,
        items: [{ ...base.items[0]!, caption: "x".repeat(201) }],
      }),
    ).toThrow();
  });
});
