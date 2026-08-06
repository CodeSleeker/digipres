"use client";

import { useScrollReveal } from "../hooks/use-scroll-reveal";

/** Mounts the template's single reveal-on-scroll observer. Renders nothing. */
export function ScrollReveal() {
  useScrollReveal();
  return null;
}
