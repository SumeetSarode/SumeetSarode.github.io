import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

// On a computer where Playwright's own browsers can't be downloaded, set
// PW_CHANNEL=chrome to use the installed Chrome, and SKIP_WEBKIT=1 to skip Safari's engine.
// GitHub's CI uses neither, so it runs both real engines.
const channel = process.env['PW_CHANNEL'];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  // Tests run against the real production build, not the dev server.
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env['CI'] && process.env['PW_REUSE_SERVER'] === '1',
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) } },
    ...(process.env['SKIP_WEBKIT']
      ? []
      : [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }]),
  ],
});
