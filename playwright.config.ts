import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalSetup: './test/playwright/globalSetup.ts',
  testDir: './test/playwright',
  timeout: 300_000,
  workers: 6,
  reporter: [['list'], ['./test/playwright/helpers/piiReporter.ts']],
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    headless: false,
    launchOptions: {
      args: ['--enable-unsafe-webgpu'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
