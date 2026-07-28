import { describe, it, expect } from "vitest";
import { isOptimizableSrc } from "@/lib/images/safe-src";

/**
 * next/image THROWS for hosts outside remotePatterns, so this predicate is
 * what stands between an owner-pasted URL and a broken tenant page. It must
 * only pass hosts that next.config.ts actually allows.
 */
describe("image source allow-list", () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co" };

  it("allows local public assets", () => {
    expect(isOptimizableSrc("/images/hero.jpg", env)).toBe(true);
  });

  it("rejects protocol-relative URLs — they are remote, not local", () => {
    expect(isOptimizableSrc("//evil.example/x.jpg", env)).toBe(false);
  });

  it("allows the demo CDN and Supabase storage", () => {
    expect(
      isOptimizableSrc("https://images.unsplash.com/photo-1?w=800", env),
    ).toBe(true);
    expect(
      isOptimizableSrc(
        "https://abcd1234.supabase.co/storage/v1/object/public/x.jpg",
        env,
      ),
    ).toBe(true);
    expect(
      isOptimizableSrc("https://other-ref.supabase.co/storage/x.jpg", env),
    ).toBe(true);
  });

  it("rejects arbitrary hosts — they fall back to plain <img>, not the optimizer", () => {
    expect(isOptimizableSrc("https://example.com/photo.jpg", env)).toBe(false);
    // A host merely CONTAINING an allowed name must not pass.
    expect(
      isOptimizableSrc("https://images.unsplash.com.evil.example/x.jpg", env),
    ).toBe(false);
    expect(
      isOptimizableSrc("https://notsupabase.co.evil.example/x.jpg", env),
    ).toBe(false);
  });

  it("rejects non-https and malformed sources", () => {
    expect(isOptimizableSrc("http://images.unsplash.com/x.jpg", env)).toBe(
      false,
    );
    expect(isOptimizableSrc("data:image/png;base64,AAAA", env)).toBe(false);
    expect(isOptimizableSrc("javascript:alert(1)", env)).toBe(false);
    expect(isOptimizableSrc("not a url", env)).toBe(false);
    expect(isOptimizableSrc(null, env)).toBe(false);
    expect(isOptimizableSrc("", env)).toBe(false);
  });

  it("honours a custom Supabase host from the environment", () => {
    const custom = { NEXT_PUBLIC_SUPABASE_URL: "https://db.aliamz.example" };
    expect(
      isOptimizableSrc("https://db.aliamz.example/storage/x.jpg", custom),
    ).toBe(true);
    // ...but ONLY that exact host.
    expect(
      isOptimizableSrc("https://sub.db.aliamz.example/x.jpg", custom),
    ).toBe(false);
  });
});
