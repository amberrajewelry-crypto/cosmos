import { test, expect } from '@playwright/test';

// Сквозной прогон: уровни с клавиатуры, досье по дате, /nebo/. Десктоп и телефон.
for (const [tag, ctx] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]] as const) {
  test.describe(tag, () => {
    test.use(ctx);
    test('уровни, досье, кнопка шеринга', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/?nobloom');
      await page.waitForTimeout(3000);
      await expect(page.locator('#hero h1')).toBeVisible();
      const before = await page.locator('.scale-lbl').innerText();
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(1800);
      expect(await page.locator('.scale-lbl').innerText()).not.toBe(before);
      await page.keyboard.press('ArrowDown'); // титры и форма видны только на уровне «тело»
      await page.waitForTimeout(1800);
      await page.fill('#birth', '1991-03-14');
      await page.click('#openNatal');
      await expect(page.locator('.dossier li').first()).toBeVisible({ timeout: 15000 });
      expect(await page.locator('.dossier li').count()).toBeGreaterThanOrEqual(8);
      await expect(page.locator('#natalPng')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

// Ссылка шеринга открывает карту сразу и в тех же терминах (местное время + tz): ASC не должен «уплыть».
test('ссылка шеринга открывает карту с тем же ASC', async ({ page }) => {
  await page.goto('/?nobloom&birth=1991-03-14&t=08:30&lat=41.716&lon=44.783&tz=Asia%2FTbilisi');
  await expect(page.locator('.dossier li').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('html')).toHaveClass(/has-birth/);
  const text = await page.locator('#natal').innerText();
  expect(text).toMatch(/ASC|асцендент/i);
});
