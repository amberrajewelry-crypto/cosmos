import { chromium, devices } from '@playwright/test';
const b = await chromium.launch(); const errs=[];
for (const [name, ctx] of [['desk', { viewport:{width:1440,height:900} }], ['mob', { ...devices['iPhone 13'] }]]) {
  const c = await b.newContext(ctx); const p = await c.newPage(); p.on('pageerror', e=>errs.push(name+': '+e.message));
  await p.goto('http://localhost:4179/', { waitUntil:'networkidle' }); await p.waitForTimeout(5200);
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-vladimir/49036807-ede9-4eba-821d-98bd4628d0cb/scratchpad/geist-'+name+'.png' });
  await p.click('#reveal'); await p.waitForTimeout(1500); await p.screenshot({ path: '/private/tmp/claude-501/-Users-vladimir/49036807-ede9-4eba-821d-98bd4628d0cb/scratchpad/geist-'+name+'-panel.png' });
  await c.close();
}
console.log('errors', errs); await b.close();
