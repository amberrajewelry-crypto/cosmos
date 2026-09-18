import { chromium } from 'playwright';
const S = process.env.S; const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1390, height: 900 } });
await p.goto('http://localhost:4179/karta.html?birth=1990-05-15&t=14%3A30&lat=55.75&lon=37.62&tz=180&mode=natal', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const t = await p.evaluate(() => document.querySelector('#natalView')?.innerText?.slice(0, 1800));
console.log(t ?? 'NO VIEW');
const el = await p.$('#natalView'); if (el && t) await el.screenshot({ path: `${S}/rz.png` });
await b.close();
