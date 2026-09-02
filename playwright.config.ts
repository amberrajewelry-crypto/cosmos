import { defineConfig } from '@playwright/test';

// E2E только для сцены (скриншот-регрессии §3.11). Юниты — отдельно, в vitest.
export default defineConfig({
  testDir: 'test-e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
