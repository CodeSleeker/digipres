import Image from "next/image";

/**
 * The Aliamz Digital mark — the AD monogram from the brand artwork, on its own
 * ink tile. The same asset ships as the browser-tab icon (app/layout.tsx), so
 * the thing in the header and the thing in the tab are identical.
 *
 * WHY THE TILE, rather than the mark on a transparent background: the mark's
 * "D" is silver, which all but disappears on the light marketing surface
 * (#f8f9fb). Keeping the artwork's own near-black background turns that into a
 * deliberate, high-contrast chip that reads at any size — verified down to the
 * 16px a favicon actually renders at.
 *
 * Raster rather than SVG because the mark is a gradient render, not line art;
 * a faithful vector of it would be a trace, not the original.
 */
export function Monogram({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/icon-192.png"
      width={size}
      height={size}
      // Decorative: the wordmark beside it already names the brand, so an
      // accessible name here would just make screen readers say it twice.
      alt=""
      aria-hidden="true"
      // Small, above the fold, and on every auth screen — worth not lazy-loading.
      priority
      className={className}
      style={{ borderRadius: Math.round(size * 0.23) }}
    />
  );
}

/**
 * The full lockup: mark above ALIAMZ DIGITAL. The strapline from the source
 * artwork is deliberately not included — it is marketing copy, and the page
 * already carries its own.
 *
 * Two files, because the wordmark is white in the original and therefore
 * invisible on a light page. `logo-light.png` is the same artwork with the
 * wordmark recoloured to the page ink; the mark and the gold DIGITAL are
 * untouched in both.
 */
export function Wordmark({
  width = 200,
  surface = "light",
  className,
}: {
  width?: number;
  /** Which background it will sit on, NOT the colour of the mark. */
  surface?: "light" | "dark";
  className?: string;
}) {
  const src = surface === "dark" ? "/brand/logo.png" : "/brand/logo-light.png";
  return (
    <Image
      src={src}
      width={width}
      // Source lockup is 900×760.
      height={Math.round((width * 760) / 900)}
      alt="Aliamz Digital"
      priority
      className={className}
    />
  );
}
