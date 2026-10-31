import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration", testMatch: "athlete-session.integration.ts", workers: 1, retries: 0,
  timeout: 45_000, expect: { timeout: 10_000 },
  use: { baseURL: "http://127.0.0.1:5198", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node --import tsx tests/integration/startAthleteServer.mjs", url: "http://127.0.0.1:5198/api/athleteSession", reuseExistingServer: false, timeout: 90_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
