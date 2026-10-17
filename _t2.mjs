import { chromium } from 'playwright';
const S = process.env.S; const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1390, height: 900 } });
for (const m of ['natal','transits', 'synastry', 'solar']) {
  await p.goto(`http://localhost:4179/karta.html?birth=1990-05-15&t=14%3A30&lat=55.75&lon=37.62&tz=180&mode=${m}${m==='synastry'?'&at=1992-11-03T12%3A00':''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2200);
  await p.waitForTimeout(1500); const box = await p.evaluate(() => { const r = document.querySelector('#natal').getBoundingClientRect(); return { y: r.top + window.scrollY, h: r.height }; }); console.log(m, Math.round(box.y), Math.round(box.h));
  await p.evaluate((y) => window.scrollTo(0, y - 20), box.y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${S}/v-${m}.png`, fullPage: true });
}
await b.close();
