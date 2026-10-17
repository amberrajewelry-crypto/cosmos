import { chromium } from 'playwright';
const S = process.env.S; const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1390, height: 900 } });
await p.goto('http://localhost:4179/', { waitUntil: 'networkidle' });
for (const [ms, n] of [[2600, 'a'], [5000, 'b'], [12000, 'c']]) { await p.waitForTimeout(n === 'a' ? ms : ms - (n === 'b' ? 2600 : 5000)); await p.screenshot({ path: `${S}/h-${n}.png`, clip: { x: 0, y: 380, width: 1390, height: 520 } }); }
await b.close();
