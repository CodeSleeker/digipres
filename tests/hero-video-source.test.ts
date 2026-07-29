import { describe, it, expect } from "vitest";
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_HERO_VIDEO_BYTES,
  heroVideoObjectKey,
  isSafeVideoUrl,
  videoUploadError,
} from "@/lib/security/media";
import { heroSchema } from "@/schemas/website-content";

/**
 * The hero scrub video is owner-supplied — uploaded or pasted — so it is
 * attacker-influenced input that ends up in a `<video src>`. These pin the
 * boundary rules.
 */

describe("isSafeVideoUrl", () => {
  it("accepts https mp4/webm and root-relative template assets", () => {
    expect(isSafeVideoUrl("https://cdn.example.com/clip.mp4")).toBe(true);
    expect(isSafeVideoUrl("https://cdn.example.com/clip.webm")).toBe(true);
    expect(isSafeVideoUrl("/templates/barber-luxury/hero-scrub.mp4")).toBe(
      true,
    );
  });

  it("accepts a Supabase Storage URL with a cache-busting query", () => {
    expect(
      isSafeVideoUrl(
        "https://abc.supabase.co/storage/v1/object/public/tenant-media/b/hero/scrub.mp4?v=1",
      ),
    ).toBe(true);
  });

  it("rejects dangerous schemes outright", () => {
    expect(isSafeVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeVideoUrl("data:video/mp4;base64,AAAA")).toBe(false);
    expect(isSafeVideoUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects http — it would be blocked as mixed content anyway", () => {
    expect(isSafeVideoUrl("http://cdn.example.com/clip.mp4")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeVideoUrl("//evil.example/clip.mp4")).toBe(false);
  });

  it("rejects containers the sampler can't use", () => {
    expect(isSafeVideoUrl("https://cdn.example.com/clip.mov")).toBe(false);
    expect(isSafeVideoUrl("https://cdn.example.com/photo.jpg")).toBe(false);
  });

  it("rejects blanks and whitespace-bearing values", () => {
    expect(isSafeVideoUrl("")).toBe(false);
    expect(isSafeVideoUrl(null)).toBe(false);
    expect(isSafeVideoUrl("https://a.example/a b.mp4")).toBe(false);
  });
});

describe("heroVideoObjectKey — the tenancy boundary", () => {
  it("puts the business id FIRST, which is what the RLS policy keys on", () => {
    // Migration 0019 checks (storage.foldername(name))[1] against
    // owns_business(). Changing this shape silently breaks upload authorization.
    expect(heroVideoObjectKey("biz-1", "clip.mp4").split("/")[0]).toBe("biz-1");
  });

  it("uses a stable name so re-uploading replaces rather than accumulates", () => {
    expect(heroVideoObjectKey("biz-1", "anything.mp4")).toBe(
      "biz-1/hero/scrub.mp4",
    );
    expect(heroVideoObjectKey("biz-1", "OTHER.MP4")).toBe(
      "biz-1/hero/scrub.mp4",
    );
  });

  it("preserves a webm container", () => {
    expect(heroVideoObjectKey("biz-1", "clip.webm")).toBe(
      "biz-1/hero/scrub.webm",
    );
  });
});

describe("videoUploadError", () => {
  it("passes an acceptable file", () => {
    expect(videoUploadError({ type: "video/mp4", size: 2_000_000 })).toBeNull();
  });

  it("rejects a non-video type", () => {
    expect(videoUploadError({ type: "image/png", size: 100 })).toMatch(/MP4/);
  });

  it("rejects an oversized file", () => {
    expect(
      videoUploadError({ type: "video/mp4", size: MAX_HERO_VIDEO_BYTES + 1 }),
    ).toMatch(/too large/);
  });

  it("only advertises containers the sampler supports", () => {
    expect(ACCEPTED_VIDEO_TYPES).toEqual(["video/mp4", "video/webm"]);
  });
});

describe("heroSchema — scrub source fields", () => {
  const base = {
    overline: "EST. 2020",
    titleLines: [{ text: "WHERE" }],
    description: "Premium grooming.",
    primaryCta: { label: "Book", href: "#contact" },
    secondaryCta: { label: "Services", href: "#services" },
    stats: [],
  };

  it("defaults to the template frames when nothing is chosen", () => {
    const parsed = heroSchema.parse(base);
    expect(parsed.heroMedia).toBeUndefined(); // consumer treats this as "frames"
    expect(parsed.heroVideoUrl).toBeUndefined();
  });

  it("accepts a video source with a URL", () => {
    const parsed = heroSchema.parse({
      ...base,
      heroMedia: "video",
      heroVideoUrl: "https://cdn.example.com/clip.mp4",
    });
    expect(parsed.heroMedia).toBe("video");
  });

  it("normalises a cleared field to undefined, falling back to the template", () => {
    expect(
      heroSchema.parse({ ...base, heroVideoUrl: "" }).heroVideoUrl,
    ).toBeUndefined();
  });

  it("rejects an unsafe URL at the CMS boundary, not on the live site", () => {
    expect(() =>
      heroSchema.parse({ ...base, heroVideoUrl: "javascript:alert(1)" }),
    ).toThrow();
  });

  it("rejects an unknown scrub source", () => {
    expect(() => heroSchema.parse({ ...base, heroMedia: "gif" })).toThrow();
  });

  it("no longer accepts the removed backgroundImage field", () => {
    // Zod strips unknown keys, so the old value simply drops on next save.
    const parsed = heroSchema.parse({
      ...base,
      backgroundImage: "https://x.example/a.jpg",
    }) as Record<string, unknown>;
    expect(parsed.backgroundImage).toBeUndefined();
  });
});
