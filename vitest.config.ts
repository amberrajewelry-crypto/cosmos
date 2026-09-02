import { defineConfig } from 'vitest/config';

// Vitest берёт только юнит/guard-тесты. E2E (Playwright, test-e2e/*.spec.ts) — отдельным раннером.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test-guard/**/*.test.ts'],
    environment: 'node',
  },
});
