import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Minimal Vitest setup for the production-readiness test suite.
 *
 * The DEFAULT environment is node: almost everything here is logic, isolation
 * and scheduler behaviour, and a DOM those tests never touch would only slow
 * them down. The few tests that must render a component opt in per file with a
 * `// @vitest-environment jsdom` docblock, so the cost is paid only where it
 * buys something.
 *
 * The `@/` alias mirrors tsconfig's `paths` so tests import the real
 * service/repository code under test.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
