import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      // Only the logic. Pages, layouts and components are thin glue over these
      // functions: they are what a browser exercises, and asserting on rendered
      // markup would test Astro rather than this site.
      include: ["src/lib/**/*.ts"],
      // Types compile away to nothing, so they can neither be covered nor uncovered.
      exclude: ["src/lib/types/**"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
