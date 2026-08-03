/**
 * The Aliamz Digital brand surface — shared by the marketing landing page and
 * the auth screens (login, forgot/reset password).
 *
 * These pages are the PLATFORM's own face. They deliberately do not use the
 * tenant template palette, which belongs to a client's website.
 *
 * DERIVED FROM THE LOGO (design/aliamz.png), sampled rather than guessed:
 *   gold   #d4a555   silver #b2b2b4   background #01030b
 *
 * Two things that follow from those numbers and shape everything below:
 *
 *  1. The logo's dark is a BLUE-black, not the warm brown-black this palette
 *     used to be built on. So the neutrals are cool now — which also lets the
 *     silver read as a deliberate second metal instead of as dirty grey.
 *
 *  2. NEITHER METAL CAN BE TEXT. On the lightest surface the gold manages
 *     2.14:1 and the silver 2.01:1, against the 4.5:1 AA needs. They are
 *     graphics only. `accent` and `silverText` are those same hues darkened
 *     until they pass on the DARKEST surface in play (the auth background), so
 *     one value is safe everywhere rather than one per background.
 *
 * Verified AA — lowest ratio anywhere is 4.62:1:
 *   ink #171920 14.4–17.6:1 · muted #555c6b 5.5–6.7:1
 *   accent #7f6333 4.7–5.5:1 · silverText #676769 4.7–5.6:1
 */

/** Straight off the artwork. Decorative use only — never text. */
export const LOGO = {
  gold: "#d4a555",
  silver: "#b2b2b4",
  ink: "#01030b",
} as const;

export const BRAND = {
  /**
   * The auth screens sit on a deeper tint than the landing page: a full-viewport
   * near-white behind a white card reads as glare, and the card loses its edge.
   * This is the darkest surface the type has to survive, so it sets the floor
   * for `accent` and `silverText` above.
   */
  page: "bg-[#e6e9ef] font-sans text-[#171920]",
  /** A step darker than the landing card, so the edge survives the tint. */
  card: "border border-[#ccd2dc] bg-white",
  border: "border-[#dfe3e9]",
  ink: "text-[#171920]",
  muted: "text-[#555c6b]",
  accent: "text-[#7f6333]",
  /** Section eyebrow / small caps label. */
  eyebrow: "text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6333]",
  /** Text input. Placeholder is #6e747f — 4.70:1, so it is legible, not a hint. */
  field:
    "w-full border border-[#ccd2dc] bg-white px-3 py-2.5 text-sm text-[#171920] placeholder:text-[#6e747f] focus-visible:border-[#7f6333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]",
  /** Field label. */
  label: "text-xs font-medium uppercase tracking-[0.2em] text-[#555c6b]",
  /** Primary action. */
  button:
    "w-full bg-[#171920] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f8f9fb] transition-colors hover:bg-[#2b2f3a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]",
  /** Inline text link. The underline carries the LOGO gold — decorative, so the
   *  full-strength hue is allowed there while the text itself stays AA. */
  link: "text-[#7f6333] underline decoration-[#d4a555] decoration-2 underline-offset-4 transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]",
  /** Quiet secondary link. */
  quietLink:
    "text-[#555c6b] transition-colors hover:text-[#171920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f6333]",
} as const;
