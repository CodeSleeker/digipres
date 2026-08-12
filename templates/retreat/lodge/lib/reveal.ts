import type { CSSProperties } from "react";

/**
 * The mockup's per-element reveal stagger.
 *
 * The source stepped delays with `data-delay="1..4"` and a rule per value; the
 * delay itself lives in CSS here too (`transition-delay: calc(var(--i) *
 * 110ms)`, see app/globals.css), so this only hands the index across as a custom
 * property and any number of items can stagger without a class per position.
 *
 * The cast is the standard escape hatch: React's CSSProperties has no index
 * signature for `--*`.
 */
export function stagger(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
