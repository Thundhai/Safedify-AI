import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000', // Frontend
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run test:e2e:full',
    port: 3000,
    reuseExistingServer: true,
    timeout: 90000,
    env: {
      PORT: '4000',
      SEED_DEMO_USERS: 'true',
    },
    stdout: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
