import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'offline.spec.ts',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4311',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'offline-production', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4311',
    url: 'http://127.0.0.1:4311',
    reuseExistingServer: false,
  },
})
