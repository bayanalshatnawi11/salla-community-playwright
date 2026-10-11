import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { getEnvironment } from './support/environment';

const environment = getEnvironment(resolve(__dirname, '..'));
const runDirectory = process.env.TESTVIBE_RUN_DIR ?? resolve(__dirname, 'test-results/current');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: resolve(runDirectory, 'playwright-report') }],
    ['json', { outputFile: resolve(runDirectory, 'results.json') }],
    [
      'allure-playwright',
      {
        resultsDir: resolve(runDirectory, 'allure-results'),
        detail: true,
        suiteTitle: false,
        environmentInfo: {
          Project: 'Salla',
          Environment: environment.name,
          Base_URL: environment.baseURL,
          Timezone: 'Asia/Amman',
          Browser: 'Playwright Chromium; see each result for its version and mode',
        },
      },
    ],
  ],
  outputDir: resolve(runDirectory, 'artifacts'),
  use: {
    baseURL: environment.baseURL,
    headless: environment.headless ?? true,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Web - Chromium',
      testIgnore: '**/*.mobile.spec.ts',
      metadata: {
        platform: 'Web',
        environment: environment.name,
        baseURL: environment.baseURL,
        browser: 'Chromium',
      },
      use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
    },
  ],
});
