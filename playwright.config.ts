import { defineConfig, devices } from '@playwright/test';

// En entornos con Chromium preinstalado, PLAYWRIGHT_CHROMIUM_PATH evita descargarlo.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'movil', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: 'npm run dev:demo -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
