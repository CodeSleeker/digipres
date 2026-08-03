import { describe, it, expect, vi, afterEach } from "vitest";
import { themePalette, PALETTE_KEYS } from "@/templates/themes";
import { TEMPLATES } from "@/templates/registry";
import { fetchLogoDataUri } from "@/lib/tenant/og-logo";

describe("themePalette", () => {
  it("returns the registered palette for a known template + theme", () => {
    expect(themePalette("barber-luxury", "default")).toMatchObject({
      background: "#0a0a0a",
      accent: "#c9a96e",
    });
  });

  it("falls back instead of throwing for an unknown pair", () => {
    // A share card is decoration; a new theme must not 500 a route crawlers hit.
    for (const args of [
      ["nope", "default"],
      ["barber-luxury", "nope"],
      [null, null],
      [undefined, undefined],
    ] as const) {
      const palette = themePalette(args[0], args[1]);
      expect(palette.background).toBeTruthy();
      expect(palette.foreground).toBeTruthy();
      expect(palette.accent).toBeTruthy();
    }
  });

  it("covers every template/theme pair the registry offers", () => {
    // The guard against adding a template and silently getting the wrong card.
    const missing: string[] = [];
    for (const template of TEMPLATES) {
      for (const theme of template.themes) {
        const key = `${template.code}:${theme.code}`;
        if (!PALETTE_KEYS.includes(key)) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps foreground legible against background", () => {
    // Not a WCAG claim for decoration, but a card whose name cannot be read is
    // useless. 4.5:1 is a reasonable floor for large display text.
    const hex = (h: string) =>
      [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lum = (c: number[]) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
    };
    for (const key of PALETTE_KEYS) {
      const [t, th] = key.split(":");
      const p = themePalette(t, th);
      const [a, b] = [lum(hex(p.foreground)), lum(hex(p.background))].sort(
        (x, y) => y - x,
      );
      expect((a! + 0.05) / (b! + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("fetchLogoDataUri", () => {
  afterEach(() => vi.restoreAllMocks());

  const png = (bytes = 32) =>
    new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { "content-type": "image/png" },
    });

  it("returns null for nothing to fetch, without calling out", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const v of [null, undefined, "", "not a url", "/relative/logo.png"]) {
      expect(await fetchLogoDataUri(v)).toBeNull();
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses non-https schemes", async () => {
    // The URL is tenant-editable and this fetch runs server-side.
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const v of [
      "http://example.com/logo.png",
      "file:///etc/passwd",
      "ftp://example.com/logo.png",
    ]) {
      expect(await fetchLogoDataUri(v)).toBeNull();
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("returns a data URI for a real raster", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => png()));
    const result = await fetchLogoDataUri("https://cdn.example.com/logo.png");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects SVG, which the rasteriser renders inconsistently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<svg/>", {
            status: 200,
            headers: { "content-type": "image/svg+xml" },
          }),
      ),
    );
    expect(
      await fetchLogoDataUri("https://cdn.example.com/logo.svg"),
    ).toBeNull();
  });

  it("returns null on a non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    expect(
      await fetchLogoDataUri("https://cdn.example.com/gone.png"),
    ).toBeNull();
  });

  it("rejects a body larger than the cap, by header and by actual size", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(8), {
            status: 200,
            headers: {
              "content-type": "image/png",
              "content-length": String(50 * 1024 * 1024),
            },
          }),
      ),
    );
    expect(await fetchLogoDataUri("https://cdn.example.com/huge.png")).toBeNull();

    // content-length is a hint, not a promise — the real length is re-checked.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(4 * 1024 * 1024), {
            status: 200,
            headers: { "content-type": "image/png" },
          }),
      ),
    );
    expect(await fetchLogoDataUri("https://cdn.example.com/lying.png")).toBeNull();
  });

  it("returns null on an empty body rather than an empty data URI", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => png(0)));
    expect(
      await fetchLogoDataUri("https://cdn.example.com/empty.png"),
    ).toBeNull();
  });

  it("never throws when the network does", async () => {
    // A crawler is waiting; a rejected promise here would fail the whole card.
    for (const boom of [
      () => Promise.reject(new Error("ETIMEDOUT")),
      () => Promise.reject(new DOMException("aborted", "TimeoutError")),
    ]) {
      vi.stubGlobal("fetch", vi.fn(boom));
      await expect(
        fetchLogoDataUri("https://cdn.example.com/slow.png"),
      ).resolves.toBeNull();
    }
  });
});
