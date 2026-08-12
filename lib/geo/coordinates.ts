/**
 * Turning what an owner can actually supply into a coordinate.
 *
 * Nobody knows their own latitude. What they can do is find the place on Google
 * Maps and copy the link — so that is the input this accepts, alongside a plain
 * pair for anyone who does have the numbers.
 *
 * Recognised:
 *   https://www.google.com/maps/@8.228,124.912,17z
 *   https://www.google.com/maps/place/Name/@8.228,124.912,17z/data=…
 *   https://maps.google.com/?q=8.228,124.912
 *   https://www.google.com/maps?ll=8.228,124.912
 *   8.228, 124.912
 *
 * NOT recognised, and it cannot be: a short link (maps.app.goo.gl/…, goo.gl/
 * maps/…) carries no coordinate at all — it is an opaque id that only Google
 * can expand, which would mean a server-side fetch of a URL a stranger supplied.
 * The caller tells the owner to open the short link and copy the full one.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** `@lat,lng` in a maps path, or `q=`/`ll=` in a query string. */
const AT_PAIR = /@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/;
const QUERY_PAIR = /[?&](?:q|ll|daddr|center)=(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/i;
const BARE_PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** True when a short link was pasted — the one input worth a specific message. */
export function isShortMapLink(input: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input);
}

/**
 * Parse a pasted link or pair. Returns null when there is nothing to read.
 *
 * `@` is tried FIRST: a Google place URL carries both a `@lat,lng` for the map
 * centre and often a `q=` holding the search text, and the centre is the one
 * that means the place.
 */
export function parseCoordinates(input: string): Coordinates | null {
  const text = input.trim();
  if (!text) return null;

  const match = AT_PAIR.exec(text) ?? QUERY_PAIR.exec(text) ?? BARE_PAIR.exec(text);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!isValidCoordinates(latitude, longitude)) return null;

  return { latitude, longitude };
}

/**
 * Both in range, and both real numbers.
 *
 * The bounds are not a formality: a longitude of 1240 (a mistyped 124.0) puts
 * the marker nowhere and would be published as the business's location in
 * structured data.
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * The pin a record carries, or null.
 *
 * ONE guard, used by everything that reads a coordinate — the JSON-LD, the
 * profile builder, the visibility check. Written as an explicit numeric test
 * rather than `!== null`, which is what the first version used and which lets
 * `undefined` through: the JSON-LD would then emit a `geo` node whose latitude
 * and longitude vanish in serialisation, publishing a GeoCoordinates that says
 * nothing. Three copies of that check would have been three chances to get it
 * wrong.
 */
export function coordinatesOf(record: {
  latitude?: number | null;
  longitude?: number | null;
}): Coordinates | null {
  const { latitude, longitude } = record;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!isValidCoordinates(latitude, longitude)) return null;
  return { latitude, longitude };
}

/**
 * The OpenStreetMap embed for a point.
 *
 * OSM rather than Google: the Google Maps Embed API needs an API key and a
 * billing account per deployment, which would make a map a paid feature. This
 * one is a plain iframe with no key, no quota and no per-tenant setup.
 *
 * `span` is the visible window in degrees — about 1.1km at 0.01, which frames a
 * building with its surroundings rather than a featureless close-up.
 */
export function osmEmbedUrl(
  { latitude, longitude }: Coordinates,
  span = 0.01,
): string {
  const bbox = [
    longitude - span,
    latitude - span,
    longitude + span,
    latitude + span,
  ]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

/**
 * Turn-by-turn directions TO the point.
 *
 * `dir/?api=1&destination=` rather than a search: a search for coordinates
 * shows a pin the visitor must then act on, while this opens the route with
 * their own location as the start — which is what someone tapping "directions"
 * from a phone in a car actually wants.
 */
export function directionsUrl({ latitude, longitude }: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
