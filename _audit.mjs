import { chromium, devices } from '@playwright/test';
const S='/private/tmp/claude-501/-Users-vladimir/49036807-ede9-4eba-821d-98bd4628d0cb/scratchpad'; const b = await chromium.launch(); const errs=[], bad=[];
const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
p.on('response', r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()); });
await p.goto('https://cosmos-alpha-three.vercel.app/', { waitUntil:'networkidle' }); await p.waitForTimeout(4500);
const H = await p.evaluate(()=>document.documentElement.scrollHeight); console.log('scrollHeight', H, 'overflowX', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
for (const y of [0, 700, 1400, 2100, 2800, H]) { await p.evaluate(v=>scrollTo(0,v), y); await p.waitForTimeout(600); await p.screenshot({ path: S+'/aud-'+y+'.png' }); }
await p.evaluate(()=>scrollTo(0,0)); await p.click('#reveal'); await p.waitForTimeout(2500); await p.screenshot({ path: S+'/aud-reveal.png' });
await p.fill('#birth','1990-05-14'); await p.click('#openNatal'); await p.waitForTimeout(2500); await p.screenshot({ path: S+'/aud-natal.png', fullPage:false });
const natalH = await p.evaluate(()=>{const n=document.getElementById('natal'); return n? [n.scrollHeight, n.clientHeight, getComputedStyle(n).overflowY]:null}); console.log('natal', natalH);
await p.keyboard.press('Escape'); await p.click('#burger'); await p.waitForTimeout(700); await p.click('#openHonesty'); await p.waitForTimeout(1200); await p.screenshot({ path: S+'/aud-honesty.png' });
await p.keyboard.press('Escape');
// tap targets < 40px
const small = await p.evaluate(()=>[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && (r.height<40||r.width<40)}).map(e=>(e.id||e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().height)));
console.log('small targets', small);
const links = await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
console.log('links', [...new Set(links)]);
console.log('errors', errs); console.log('bad', bad); await b.close();
