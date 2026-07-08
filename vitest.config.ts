// Unit test runner (Playwright e2e lives in tests/*.spec.ts and is configured
// separately in playwright.config.ts — it only matches *.spec.ts).
//
//   npm run test:unit          -> all unit tests
//   npx vitest run <path>      -> one file
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Unbounded workers spawn one jsdom per core and exhaust memory on this
    // machine — every file then dies with "Vitest failed to find the current
    // suite". Cap keeps the run stable.
    maxWorkers: 4,
    projects: [
      {
        // API handlers + pure logic: plain node, no DOM.
        test: {
          name: "node",
          environment: "node",
          include: [
            "tests/unit/api/**/*.test.ts",
            "tests/unit/logic/**/*.test.ts",
            "tests/unit/server/**/*.test.ts",
          ],
        },
      },
      {
        // React component smoke tests: jsdom + testing-library.
        plugins: [react()],
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["tests/unit/setup.dom.ts"],
          include: ["tests/unit/components/**/*.test.tsx"],
        },
      },
    ],
  },
});
