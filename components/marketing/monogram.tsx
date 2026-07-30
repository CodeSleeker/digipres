/**
 * The Aliamz Digital monogram — the same mark shipped as the tab/app icon
 * (app/icon.svg, app/apple-icon.png), inlined here so the brand lockup on the
 * marketing and auth screens costs no extra request and scales cleanly.
 *
 * Colours are the brand's own (#111113 ink / #FAFAF8 paper), not the marketing
 * palette in theme.ts: the mark must read identically wherever it appears —
 * favicon, header, an avatar pasted into a directory listing — so it does not
 * follow the surface it happens to sit on. At tile scale the difference from
 * the page ink (#1c1a17) is imperceptible.
 *
 * `variant="light"` inverts it (paper tile, ink A) for dark surfaces.
 */
export function Monogram({
  size = 28,
  variant = "dark",
  className,
}: {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
}) {
  const tile = variant === "dark" ? "#111113" : "#FAFAF8";
  const stroke = variant === "dark" ? "#FAFAF8" : "#111113";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      // Decorative: the wordmark beside it already names the brand, so a second
      // accessible name here would just make screen readers say it twice.
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="512" height="512" rx="120" fill={tile} />
      <g
        stroke={stroke}
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M 168 364 L 256 148 L 344 364" />
        <path d="M 196 296 L 316 296" />
      </g>
    </svg>
  );
}
