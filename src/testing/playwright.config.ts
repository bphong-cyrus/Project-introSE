import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './system_testing',
  outputDir: './system_testing/test_result',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './system_testing/playwright_report' }]],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    headless: true,
    baseURL: 'http://localhost:8081',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
