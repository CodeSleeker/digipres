/**
 * The human-quotable code for an enquiry.
 *
 * WHY IT IS DERIVED, NOT STORED. An enquiry already has a unique, immutable
 * identifier — its `id`. A second stored code would be a second thing that can
 * be absent, duplicated or disagree with the row it names, and a migration to
 * carry it. Deriving means the code for a given enquiry is the same string
 * everywhere, forever, computed by one function.
 *
 * WHAT IT IS FOR. Someone who has just sent an enquiry is told to quote this
 * if they carry on the conversation elsewhere — Messenger, a phone call. The
 * owner reads it on their inbox card and knows which of the week's enquiries
 * is being talked about.
 *
 * THE FIRST EIGHT HEX OF THE UUID, rather than a hash. It is directly
 * greppable: given "ENQ-3F7A-92C1", `select * from enquiries where id like
 * '3f7a92c1%'` finds the row. A hash would need this function run in reverse,
 * which it cannot be.
 *
 * COLLISIONS are 32 bits of a v4 uuid, and only matter WITHIN one business's
 * inbox — two tenants sharing a code is not a confusion anyone can experience.
 * At a thousand enquiries for one business the chance of any pair colliding is
 * about one in ten thousand, and the failure mode is an owner briefly looking
 * at the wrong one of two rows that both carry the sender's name and date. The
 * code is a convenience, not a key; nothing looks anything up by it.
 *
 * TRANSCRIPTION. Hex has no letter O and no letter I, so a spoken "oh" is
 * unambiguously zero and a spoken "eye" is unambiguously one — which is why
 * this is not re-encoded into a "friendlier" alphabet that would break the
 * grep above.
 */
export function enquiryReference(id: string): string {
  const hex = id.replace(/[^0-9a-fA-F]/g, "").toUpperCase();

  // A malformed id is not worth throwing over: the caller is rendering an
  // inbox card or a confirmation, and neither should 500 because a row's id
  // was not the shape this expected.
  if (hex.length < 8) return "ENQ-????-????";

  return `ENQ-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
