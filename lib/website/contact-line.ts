/**
 * What a derived contact-detail line IS, so a template can make it actionable.
 *
 * The lines reach a template as plain strings — `buildContactDetails` composes
 * them from the tenant's own columns, so nothing carries a type alongside them
 * and the SHAPE of the string is all there is to go on.
 *
 * The rules live here rather than in a template because they are behaviour, not
 * presentation: a phone number is a phone number on every design, and a regex
 * that gets it wrong should be wrong in one place. Each template still renders
 * its own markup — the anchor on the retreat is ink on ivory and on the
 * patisserie it is a hover to paper, and that difference belongs to them.
 */

/**
 * `+63 917 123 4567`, `(088) 555 0134`, `0917-123-4567`.
 *
 * The optional leading `(` is a FIX, not decoration. The rule this was lifted
 * from required the first character to be a digit or `+`, so a landline
 * written the way most people write one — with the area code in brackets —
 * fell through to plain text and was never tappable. It went unnoticed because
 * the seeded numbers are all mobiles.
 *
 * The tail is deliberately loose (digits, spaces, brackets, plus, hyphen) and
 * the length floor is what does the real work: it keeps a house number, a year
 * or a postcode from being dialled.
 */
const PHONE = /^\+?\(?\d[\d\s()+-]{6,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactLineKind = "phone" | "email" | "text";

export interface ContactLineLink {
  kind: ContactLineKind;
  /** `tel:`/`mailto:` target, or null when the line is just text. */
  href: string | null;
}

/**
 * Classify one line.
 *
 * A phone number that can't be tapped on a phone is a small failure repeated by
 * every visitor holding one — which, on these sites, is most of them.
 */
export function contactLine(line: string): ContactLineLink {
  const trimmed = line.trim();

  if (PHONE.test(trimmed)) {
    // Strip formatting for the href but keep it in the visible text: `tel:`
    // wants the diallable digits, a reader wants the spacing.
    return { kind: "phone", href: `tel:${trimmed.replace(/[^\d+]/g, "")}` };
  }
  if (EMAIL.test(trimmed)) {
    return { kind: "email", href: `mailto:${trimmed}` };
  }
  return { kind: "text", href: null };
}
