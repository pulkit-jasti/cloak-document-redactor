import { defineConfig } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

export default defineConfig({
  globalSetup: './test/playwright/globalSetup.ts',
  testDir: './test/playwright',
  timeout: 600_000,
  workers: process.env.VITE_MODEL?.startsWith('ollama:') ? 1 : 6,
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
