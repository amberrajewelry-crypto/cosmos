import { test, expect } from '@playwright/test';

// Скриншот-регрессия сцены: небо/фигура не должны «переехать» после рефакторинга (§3.11).
test('сцена: фигура на месте после загрузки', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600); // дать кадрам стабилизироваться
  await expect(page).toHaveScreenshot('scene-baseline.png', { maxDiffPixelRatio: 0.02 });
});
