import { defineConfig, devices } from "@playwright/test";

// Regression suite for the live app. Read-only by design: it drives every
// major flow up to (but never through) writes, so it is always safe to run
// against production before/after a deploy.
//
//   npm run test:e2e                    -> tests https://trainnolimit.com
//   BASE_URL=http://localhost:3001 ...  -> tests a local server
export default defineConfig({
  testDir: "./tests",
  // Only *.spec.ts is Playwright's; tests/unit/**/*.test.ts* belongs to vitest.
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://trainnolimit.com",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /portal\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
      testMatch: /portal\.spec\.ts|public\.spec\.ts/,
    },
  ],
});
