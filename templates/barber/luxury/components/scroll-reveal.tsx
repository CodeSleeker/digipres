"use client";

import { useScrollReveal } from "../hooks/use-scroll-reveal";

/** Mounts the global reveal-on-scroll observer once for the template. */
export function ScrollReveal() {
  useScrollReveal();
  return null;
}
