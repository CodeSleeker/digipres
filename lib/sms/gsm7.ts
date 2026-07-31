/**
 * GSM-7 encoding, because it is what an SMS actually costs.
 *
 * A text is billed per SEGMENT, and the segment size depends entirely on the
 * alphabet used:
 *
 *   GSM-7  160 chars in one segment, then 153 per concatenated segment
 *   UCS-2   70 chars in one segment, then  67 per concatenated segment
 *
 * A SINGLE character outside GSM-7 anywhere in the body forces the whole message
 * to UCS-2 and more than halves its capacity. An em dash or a smart apostrophe —
 * invisible in review, routinely produced by phones and copy-paste — turns a
 * one-credit text into three.
 *
 * That matters here beyond writing careful templates, because business names,
 * service names and customer names are interpolated into every message and are
 * typed by clients and their customers. `toGsm7()` is the boundary that makes an
 * apostrophe someone pasted from Word cost nothing.
 */

/** GSM 03.38 basic alphabet — one septet each. */
const BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);

/** Extension table — valid, but each costs TWO septets (an escape + the char). */
const EXTENDED = new Set("\f^{}\\[~]|€");

/**
 * Characters that have a faithful GSM-7 spelling. Everything here is something a
 * phone keyboard, Word or a web form produces by itself — which is exactly why
 * they must be handled rather than warned about.
 */
const TRANSLITERATIONS: Record<string, string> = {
  // Dashes. The em dash is the single most expensive character in this codebase.
  "‐": "-", "‑": "-", "‒": "-", "–": "-",
  "—": "-", "―": "-", "−": "-",
  // Quotes and apostrophes, as produced by smart-quote autocorrect.
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "″": '"',
  // Spaces that look identical to a normal one.
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  "　": " ",
  // Zero-width characters, which cost a full segment switch and render as nothing.
  "​": "", "‌": "", "‍": "", "﻿": "", "­": "",
  // Common symbols.
  "…": "...", "•": "-", "·": ".", "×": "x", "÷": "/",
  "™": "TM", "®": "(R)", "©": "(C)", "℗": "(P)",
  "₱": "PHP", // peso — a real risk in a Philippine business name
  "½": "1/2", "¼": "1/4", "¾": "3/4",
  "⁄": "/", "≠": "!=", "≤": "<=", "≥": ">=",
  "«": '"', "»": '"', "‹": "'", "›": "'",
};

function isGsm7Char(ch: string): boolean {
  return BASIC.has(ch) || EXTENDED.has(ch);
}

/** True when every character is representable, i.e. the cheap encoding applies. */
export function isGsm7(text: string): boolean {
  for (const ch of text) if (!isGsm7Char(ch)) return false;
  return true;
}

/**
 * The nearest GSM-7 rendering of `text`.
 *
 * Three passes, cheapest first: a known spelling, then dropping diacritics from
 * a letter GSM-7 lacks (é is in the alphabet and survives untouched; í is not
 * and becomes i), then discarding what has no Latin form at all.
 *
 * Dropping is deliberate for that last case. The alternative is a message that
 * silently costs 3x for a decorative emoji in a shop name, and the recipient
 * cannot read the character anyway on the phones this targets.
 */
export function toGsm7(text: string): string {
  let out = "";
  for (const ch of text) {
    if (isGsm7Char(ch)) {
      out += ch;
      continue;
    }

    const mapped = TRANSLITERATIONS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }

    // é, ö, ñ and friends never reach here — they ARE GSM-7. This is for í, ó,
    // ú, ã, ç and the rest of the Latin set the standard omits.
    const stripped = ch.normalize("NFD").replace(/\p{M}+/gu, "");
    if (stripped && isGsm7(stripped)) {
      out += stripped;
      continue;
    }

    // No representation: emoji, CJK, symbols. Dropped rather than paid for.
  }
  return out;
}

export interface SmsCost {
  encoding: "GSM-7" | "UCS-2";
  /** Septets for GSM-7, UTF-16 code units for UCS-2 — what the carrier counts. */
  units: number;
  /** Billable segments. This is the credit count. */
  segments: number;
}

/** What a body will actually be billed, without sending it. */
export function smsSegments(text: string): SmsCost {
  if (isGsm7(text)) {
    let units = 0;
    for (const ch of text) units += EXTENDED.has(ch) ? 2 : 1;
    return {
      encoding: "GSM-7",
      units,
      segments: units <= 160 ? 1 : Math.ceil(units / 153),
    };
  }

  // UCS-2 counts UTF-16 code units, so anything above the BMP counts twice.
  let units = 0;
  for (const ch of text) units += ch.codePointAt(0)! > 0xffff ? 2 : 1;
  return {
    encoding: "UCS-2",
    units,
    segments: units <= 70 ? 1 : Math.ceil(units / 67),
  };
}

/**
 * A tenant-supplied value cut to `max` characters at a word boundary.
 *
 * Applied to the NAMES interpolated into a template rather than to the finished
 * body: a business called "The Extremely Long Barbershop And Grooming Lounge"
 * must not be able to push a confirmation into a second segment, but truncating
 * the assembled sentence would cut the date or the word CONFIRMED off the end.
 */
export function clipForSms(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  // Only respect a word boundary if it doesn't discard most of the allowance.
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}
