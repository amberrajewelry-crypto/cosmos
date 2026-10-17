import { test, expect, type Page } from '@playwright/test';

// /bazi на телефоне 375 px (правило сайта): без горизонтального скролла, без ошибок, разбор строится,
// разделы раскрываются, цели касания не меньше 44 px, «не знаю» ставится нажатием по тексту, анимации ждут касания.
const VLAD = '/bazi?d=1991-11-10&t=00:37&p=42.27,42.70,Asia/Tbilisi,Kutaisi&g=m';
const NOTIME = '/bazi?d=1975-07-04&t=-&p=59.94,30.31,Europe/Moscow,Saint%20Petersburg&g=f';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

const errorsOf = (page: Page) => { const e: string[] = []; page.on('pageerror', (x) => e.push(String(x))); return e; };
const scrollW = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);
/** Цели касания: высота меньше 44 px или ширина меньше 24 px. */
const smallTargets = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#out button, #out a, #out summary, #out select, .hero a, .hero button, .foot a')]
  .filter((e) => e.offsetParent !== null && !e.closest('details:not([open])'))
  .filter((e) => e.offsetWidth > 0 && (e.offsetHeight < 44 || e.offsetWidth < 24)) // offset* — без transform; ширина ≥24 (WCAG 2.5.8), календарь 7 колонок
  .filter((e) => getComputedStyle(e).display !== 'inline') // строчные ссылки в тексте: зона касания — padding, высота строки
  .map((e) => `${e.tagName.toLowerCase()}.${e.className} ${e.offsetWidth}x${e.offsetHeight} «${(e.textContent || '').trim().slice(0, 20)}»`));

test('разбор строится, без скролла вбок и ошибок; разделы раскрываются', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(VLAD);
  await expect(page.locator('.who h2')).toBeVisible();
  expect(await scrollW(page)).toBeLessThanOrEqual(375);
  await expect(page.locator('.who .lt')).toContainText(/\d{4}–\d{4}/);
  const folds = page.locator('#out > section > details.fold');
  expect(await folds.count()).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < await folds.count(); i++) await folds.nth(i).locator(':scope > summary').click();
  await page.evaluate(() => document.querySelectorAll('#out details').forEach((d) => ((d as HTMLDetailsElement).open = true))); // вложенные (глубже, подробнее)
  await page.waitForTimeout(800);
  expect(await scrollW(page)).toBeLessThanOrEqual(375);
  const text = await page.locator('#out').innerText();
  expect(text).not.toMatch(/undefined|NaN|\[object|\$\{/);
  expect(errors).toEqual([]);
});

test('цели касания не меньше 44 px', async ({ page }) => {
  await page.goto(VLAD);
  await expect(page.locator('.who h2')).toBeVisible();
  const folds = page.locator('#out > section > details.fold');
  for (let i = 0; i < await folds.count(); i++) await folds.nth(i).locator(':scope > summary').click();
  await page.evaluate(() => document.querySelectorAll('#out details').forEach((d) => ((d as HTMLDetailsElement).open = true))); // вложенные (глубже, подробнее)
  await page.waitForTimeout(800);
  expect(await smallTargets(page)).toEqual([]);
});

test('без времени рождения: флажок по тексту «не знаю», без ошибок', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/bazi');
  await page.getByText('не знаю', { exact: true }).click();
  expect(await page.locator('#fnt').isChecked()).toBe(true);
  expect(await page.locator('#ft').isDisabled()).toBe(true);
  await page.goto(NOTIME);
  await expect(page.locator('.who h2')).toBeVisible();
  await expect(page.locator('#out')).toContainText('время неизвестно');
  expect(await scrollW(page)).toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
});

test('анимации ждут первого касания', async ({ page }) => {
  await page.goto(VLAD);
  await expect(page.locator('.who h2')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.classList.contains('anim-on'))).toBe(false);
  await page.locator('.who h2').tap();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('anim-on'))).toBe(true);
});
