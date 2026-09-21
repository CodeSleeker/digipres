import type { CSSProperties } from "react";

/**
 * The mockup's per-element reveal delay.
 *
 * The source markup carried `data-animate="fade-up" data-delay="200"` and a
 * script that set a `setTimeout` per element before adding an animation class.
 * The visual result is a staggered entrance; the mechanism is not worth
 * porting, because a timer per element fires whether or not the element is
 * still on screen and cannot be interrupted by `prefers-reduced-motion`.
 *
 * Here the delay is a custom property the CSS reads
 * (`transition-delay: var(--d, 0ms)`, see app/globals.css) — same stagger, no
 * timers, and the reduced-motion rule can switch the whole thing off in one
 * place. The cast is the standard escape hatch: React's CSSProperties has no
 * index signature for `--*`.
 */
export function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}

/** The entrance variants the source used, as class names. */
export type RevealKind = "up" | "in" | "scale" | "left" | "right";

/**
 * `.reveal` plus its variant.
 *
 * Every animated element in the source carried `observe-hidden` (opacity 0)
 * and gained an `animate-*` class on intersection. The two are collapsed into
 * one class here: `.reveal` IS the hidden state, and `.is-visible` is the
 * shown one.
 */
export function reveal(kind: RevealKind = "up"): string {
  return `reveal reveal-${kind}`;
}
