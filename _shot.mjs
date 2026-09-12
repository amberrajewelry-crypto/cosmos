import { chromium, devices } from '@playwright/test';
const S='/private/tmp/claude-501/-Users-vladimir/49036807-ede9-4eba-821d-98bd4628d0cb/scratchpad'; const b = await chromium.launch(); const errs=[];
for (const [name, ctx] of [['desk', { viewport:{width:1440,height:900} }], ['mob', { ...devices['iPhone 13'] }]]) {
  const c = await b.newContext(ctx); const p = await c.newPage();
  p.on('pageerror', e=>errs.push(name+': '+e.message));
  await p.goto('http://localhost:4179/', { waitUntil:'networkidle' }); await p.waitForTimeout(4800);
  for (const k of [1,2,3,4,5]) { await p.click('.scale-btn[data-dir="1"]'); await p.waitForTimeout(1700); await p.screenshot({ path: S+'/scale-'+name+'-out'+k+'.png' }); }
  for (const k of [1,2,3,4,5,6,7,8]) { await p.click('.scale-btn[data-dir="-1"]'); await p.waitForTimeout(1700); if (k>5) await p.screenshot({ path: S+'/scale-'+name+'-in'+(k-5)+'.png' }); }
  await c.close();
}
console.log('errors:', errs); await b.close();
