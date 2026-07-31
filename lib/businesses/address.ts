/**
 * Formatting the split address back into something a person reads.
 *
 * Migration 0027 broke the address into components so machines can resolve the
 * locality. Humans still want one line, and every surface that shows an address
 * — the site's contact card, the platform portal — must compose it the same
 * way, or the site and the structured data will disagree about where the
 * business is.
 */

export interface AddressParts {
  /** Street line. Pre-0027 rows hold the whole address here. */
  address: string | null;
  addressLocality: string | null;
  addressRegion: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
}

/**
 * One line, comma-separated, skipping whatever is missing.
 *
 * The country code is deliberately LEFT OUT: "PH" is there for schema.org, and
 * printing it on a local barber's contact card reads like a form field rather
 * than an address. A tenant serving one town does not need their own country
 * spelled out to their neighbours.
 */
export function formatAddress(parts: AddressParts): string | null {
  const line = [
    parts.address,
    parts.addressLocality,
    parts.addressRegion,
    parts.addressPostalCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return line || null;
}

/**
 * The schema.org PostalAddress, or null when there is nothing to say.
 *
 * Only non-empty components are included: an empty string in `addressLocality`
 * is worse than the field being absent, because it asserts the business is in a
 * place with no name.
 */
export function postalAddress(
  parts: AddressParts,
): Record<string, string> | null {
  const node: Record<string, string> = { "@type": "PostalAddress" };

  const map: [keyof AddressParts, string][] = [
    ["address", "streetAddress"],
    ["addressLocality", "addressLocality"],
    ["addressRegion", "addressRegion"],
    ["addressPostalCode", "postalCode"],
    ["addressCountry", "addressCountry"],
  ];

  for (const [source, key] of map) {
    const value = parts[source]?.trim();
    if (value) node[key] = value;
  }

  // Just the @type means every component was blank.
  return Object.keys(node).length > 1 ? node : null;
}
