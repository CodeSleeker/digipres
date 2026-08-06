import type { CSSProperties } from "react";

/**
 * The mockup's per-element reveal stagger.
 *
 * The delay itself lives in CSS (`transition-delay: calc(var(--i) * 85ms)`, see
 * app/globals.css) — this only hands the index across as a custom property, so
 * a list can stagger without a class per position. The cast is the standard
 * escape hatch: React's CSSProperties has no index signature for `--*`.
 */
export function stagger(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
