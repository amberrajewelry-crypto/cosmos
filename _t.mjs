import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1390, height: 900 } });
for (const m of ['transits', 'synastry', 'solar']) {
  await p.goto(`http://localhost:4179/karta.html?birth=1990-05-15&t=14%3A30&lat=55.75&lon=37.62&tz=180&mode=${m}${m==='synastry'?'&at=1992-11-03T12%3A00':''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const t = await p.evaluate(() => document.querySelector('#natalView .rz-wrap')?.innerText?.slice(0, 700));
  console.log('=== ' + m + '\n' + (t ?? 'NO'));
}
await b.close();
