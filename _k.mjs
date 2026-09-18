import { chromium } from 'playwright';
const S = process.env.S; const base = 'http://localhost:4179';
const pages = [['/', 'home'], ['/karta.html', 'karta'], ['/natalnaya-karta/05-15/', 'date'], ['/o-proekte/', 'about']];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, tag] of [[1390, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 }, deviceScaleFactor: 1 });
  for (const [u, n] of pages) {
    const p = await ctx.newPage(); await p.goto(base + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
    if (n !== 'home') for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(120); }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${S}/${n}-${tag}.png`, fullPage: n !== 'home' });
    await p.close();
  }
  await ctx.close();
}
await b.close();
