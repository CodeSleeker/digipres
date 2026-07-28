import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Minimal Vitest setup for the production-readiness test suite.
 *
 * Node environment (no DOM) — these are logic/isolation/scheduler tests, not
 * component tests. The `@/` alias mirrors tsconfig's `paths` so tests import the
 * real service/repository code under test.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
