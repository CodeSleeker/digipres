/**
 * Alphanumeric SMS sender IDs — shared by every provider that supports them.
 *
 * The value itself comes from `businesses.sms_sender_id`, set by platform staff
 * (migration 0028). It is deliberately NOT derived from the business name any
 * more: the name is client-editable, and a sender ID has to be REGISTERED with
 * the carrier, so a rename used to be able to silently start getting a tenant's
 * messages rejected or relabelled.
 */

/** GSM's cap on an alphanumeric sender ID. Carriers truncate or reject beyond it. */
export const SENDER_ID_MAX = 11;

/**
 * The nearest usable sender ID, or null when nothing survives.
 *
 * Whole words are preferred over a hard cut, so "Ronie's Barber" becomes
 * "Ronies" rather than "Ronies Barb". Kept even though the value is now curated
 * by staff rather than derived: it is the last guard before the carrier, and
 * silently sending an over-long or punctuated ID is worse than trimming it.
 */
export function normalizeSenderId(raw: string): string | null {
  const cleaned = raw
    // Only letters, digits and spaces survive; apostrophes, "&" and accents are
    // the common carrier rejections.
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length <= SENDER_ID_MAX) return cleaned;

  const words = cleaned.split(" ");
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > SENDER_ID_MAX) break;
    out = next;
  }

  // A single first word longer than the limit still has to be cut somewhere.
  return out || words[0]!.slice(0, SENDER_ID_MAX);
}
