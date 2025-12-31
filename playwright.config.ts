import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test configuration for Medium MCP Server
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  // Only run E2E tests (*.spec.ts), exclude Jest integration tests (*.test.ts)
  testMatch: '**/*.spec.ts',

  // Global setup: Ensure valid session exists before running tests
  globalSetup: './scripts/utils/setup-test-session.ts',

  // Maximum time one test can run
  timeout: 60000, // 60 seconds per test

  // Run tests serially to avoid session file conflicts
  fullyParallel: false,
  workers: 1, // Single worker to prevent race conditions on session files

  // Retry failed tests once
  retries: 1,

  // Reporter configuration
  reporter: [
    ['list'], // Console output
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],

  // Shared settings for all tests
  use: {
    // Run headless by default (use npm run test:headed for visible browser)
    headless: true,

    // Capture trace on first retry
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Base URL for navigations
    baseURL: 'https://medium.com',
  },

  // Test projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
