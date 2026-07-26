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
          // TRANSITIONAL — remove when the last handler test is ported.
          //
          // These tests stub Feishu HTTP and assert the Feishu code path.
          // Production has run Postgres since 2026-07-21, so until they are
          // ported they cover a backend nobody uses. They only ever passed
          // because DATA_BACKEND defaulted to "feishu"; now that Postgres is
          // the default, the dependency has to be stated out loud rather than
          // inherited by accident. Every ported file drops out of this pin.
          env: { DATA_BACKEND: "feishu" },
          include: [
            "tests/unit/api/**/*.test.ts",
            "tests/unit/logic/**/*.test.ts",
            "tests/unit/server/**/*.test.ts",
          ],
        },
      },
      {
        // Handler tests against a REAL local Postgres (nolimit_test) — the
        // path production runs. Ported files move here out of "node".
        // Requires: node --env-file=.env scripts/setupTestDb.mjs
        test: {
          name: "pg",
          environment: "node",
          setupFiles: ["tests/unit/pg/setup.ts"],
          include: ["tests/unit/pg/**/*.test.ts"],
          // One worker: every file truncates the same shared database.
          maxWorkers: 1,
          fileParallelism: false,
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
