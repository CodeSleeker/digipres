/**
 * Maps a list index to the mockup's staggered reveal-delay class.
 * Delays only exist for 1–5 in the source; index 0 (and >5) get no delay.
 */
export function revealDelay(index: number): string {
  return index >= 1 && index <= 5 ? `reveal-delay-${index}` : "";
}
