import { defineConfig } from '@playwright/test';

// E2E по собранному preview (как на проде: чанки, ленивые импорты). Юниты — в vitest.
export default defineConfig({
  testDir: 'test-e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4179', launchOptions: { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] } },
  webServer: {
    command: 'npm run build && npx vite preview --port 4179 --strictPort',
    url: 'http://localhost:4179',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
