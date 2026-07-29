/**
 * The Aliamz Digital brand surface — light, minimal — shared by the marketing
 * landing page and the auth screens (login, forgot/reset password).
 *
 * These pages are the PLATFORM's own face. They deliberately do not use the
 * tenant template palette (dark/gold), which belongs to a client's website.
 *
 * Contrast on the landing surface `#faf9f7`, all AA or better for their use:
 *   ink #1c1a17 ~16:1 · muted #57534a ~7:1 · accent #6f5b2d ~6:1
 * Gold #c9a96e is decorative only — never body text.
 */
export const BRAND = {
  /**
   * The auth screens sit on a deeper tint than the landing page: a full-viewport
   * `#faf9f7` behind a white card reads as glare, and the card loses its edge.
   * Still AA on this tone — muted #57534a ~6.4:1, accent #6f5b2d ~5.3:1.
   */
  page: "bg-[#ece8df] font-sans text-[#1c1a17]",
  /** Border is a step darker than the landing card so the edge survives the
   *  tinted background it now sits on. */
  card: "border border-[#d9d4c9] bg-white",
  border: "border-[#e8e4dc]",
  ink: "text-[#1c1a17]",
  muted: "text-[#57534a]",
  accent: "text-[#6f5b2d]",
  /** Section eyebrow / small caps label. */
  eyebrow: "text-xs font-semibold uppercase tracking-[0.35em] text-[#6f5b2d]",
  /** Text input. */
  field:
    "w-full border border-[#d9d4c9] bg-white px-3 py-2.5 text-sm text-[#1c1a17] placeholder:text-[#8a857a] focus-visible:border-[#6f5b2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5b2d]",
  /** Field label. */
  label: "text-xs font-medium uppercase tracking-[0.2em] text-[#57534a]",
  /** Primary action. */
  button:
    "w-full bg-[#1c1a17] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#faf9f7] transition-colors hover:bg-[#3a352e] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5b2d]",
  /** Inline text link. */
  link: "text-[#6f5b2d] underline decoration-[#c9a96e] decoration-2 underline-offset-4 transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5b2d]",
  /** Quiet secondary link. */
  quietLink:
    "text-[#57534a] transition-colors hover:text-[#1c1a17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f5b2d]",
} as const;
