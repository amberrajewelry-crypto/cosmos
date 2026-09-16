import { test, expect } from '@playwright/test';

// Сцена живая (мерцание, дыхание) — пиксельный эталон дрожит; проверяем структуру: фигура в центре кадра светлее фона.
// Скриншот раскладываем прямо в браузере через 2D-canvas (без PNG-библиотек в node).
test('сцена: фигура в центре после загрузки', async ({ page }) => {
  await page.goto('/?nobloom');
  await page.waitForTimeout(4500); // сборка фигуры ~3.2 с
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 600 } });
  const { center, edge } = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    const mean = (x: number, y: number, w: number, h: number) => { const d = ctx.getImageData(x, y, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4); };
    return { center: mean(img.width / 2 - 40, img.height / 2 - 40, 80, 80), edge: mean(8, 8, 40, 40) };
  }, shot.toString('base64'));
  expect(center).toBeGreaterThan(edge + 10);
});
