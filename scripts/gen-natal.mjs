import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// SSG натальных страниц (§5.3): грузим TS-модуль через Vite SSR (резолвит импорты как в приложении),
// прогоняем 366 дат × 2 языка, пишем статические HTML в public/ (Vite копирует их в dist как есть).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://cosmos-alpha-three.vercel.app';

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { natalPage, urlFor, signPage, signUrl } = await vite.ssrLoadModule('/src/natal/page.ts');
const { sunSignAndConstellation, SIGNS_RU, SIGNS_EN } = await vite.ssrLoadModule('/src/compute/sign.ts');

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function writePage(relUrl, html) {
  const out = resolve(ROOT, 'public', relUrl.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, 'utf8');
}

const dates = [];
for (let month = 1; month <= 12; month++) {
  const days = new Date(Date.UTC(2024, month, 0)).getUTCDate(); // 2024 високосный → 29.02 есть
  for (let day = 1; day <= days; day++) dates.push([month, day]);
}

let n = 0;
const urls = { ru: [], en: [] };
for (const lang of ['ru', 'en']) {
  for (const [month, day] of dates) {
    const url = urlFor(lang, month, day);
    await writePage(url, natalPage(month, day, lang));
    urls[lang].push(url);
    n++;
  }
}

// Группируем даты по знаку → 12 страниц знаков × 2 языка (long-tail «натальная карта {знак}»).
const bySign = Array.from({ length: 12 }, () => []);
for (const [month, day] of dates) {
  const { signIndex, constellationLatin } = sunSignAndConstellation(new Date(Date.UTC(2024, month - 1, day, 12, 0, 0)));
  bySign[signIndex].push({ month, day, constellationLatin });
}
let signN = 0;
for (const lang of ['ru', 'en']) {
  for (let i = 0; i < 12; i++) {
    await writePage(signUrl(lang, i), signPage(i, lang, bySign[i]));
    urls[lang].push(signUrl(lang, i));
    signN++;
  }
}

// Хаб-страницы для внутренней перелинковки (краулу нужен вход ко всем датам).
function hub(lang) {
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  const brand = lang === 'ru' ? 'Космос внутри тебя' : 'The Cosmos Inside You';
  const h1 = lang === 'ru' ? 'Настоящая натальная карта по дате рождения' : 'Real natal chart by birth date';
  const lede = lang === 'ru'
    ? 'Выбери свою дату — покажем твой настоящий знак по реальному положению звёзд. Настоящая, сидерическая натальная карта.'
    : "Pick your date — we'll show your true sign by the real position of the stars. A real, sidereal natal chart.";
  const signNames = lang === 'ru' ? SIGNS_RU : SIGNS_EN;
  const signLinks = signNames.map((nm, i) => `<a href="${signUrl(lang, i)}">${nm}</a>`).join(' ');
  let body = `<section><h2>${lang === 'ru' ? 'По знаку' : 'By sign'}</h2><div class="days">${signLinks}</div></section>`;
  for (let month = 1; month <= 12; month++) {
    const links = dates.filter(([m]) => m === month)
      .map(([m, d]) => `<a href="${urlFor(lang, m, d)}">${d}</a>`).join(' ');
    body += `<section><h2>${months[month - 1]}</h2><div class="days">${links}</div></section>`;
  }
  const selfUrl = SITE + (lang === 'ru' ? '/natalnaya-karta/' : '/en/natal-chart/');
  return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${h1} — ${brand}</title>
<meta name="description" content="${lede}"><link rel="canonical" href="${selfUrl}">
<style>:root{--ink:#e8e2cf;--gold:#bfa14a;--bg:#141033}body{margin:0;background:var(--bg);color:var(--ink);font-family:Georgia,serif;line-height:1.6}.wrap{max-width:820px;margin:0 auto;padding:32px 22px 64px}h1{font-family:'SF Mono',monospace;color:var(--gold);letter-spacing:1px}h2{color:var(--gold);font-size:17px;margin:22px 0 6px}.days{display:flex;flex-wrap:wrap;gap:4px 10px}.days a{color:var(--ink);font-family:'SF Mono',monospace;font-size:13px;text-decoration:none;opacity:.85}.days a:hover{color:var(--gold)}.top a{color:var(--gold);text-decoration:none;font-family:'SF Mono',monospace;font-size:12px}</style>
</head><body><div class="wrap"><div class="top"><a href="/">${brand}</a></div><h1>${h1}</h1><p style="font-size:19px">${lede}</p>${body}</div></body></html>`;
}
await writePage(lang_url('ru'), hub('ru'));
await writePage(lang_url('en'), hub('en'));
function lang_url(lang) { return lang === 'ru' ? '/natalnaya-karta/' : '/en/natal-chart/'; }

// Sitemap со всеми URL + hreflang-парами.
const allUrls = [...urls.ru, ...urls.en, '/natalnaya-karta/', '/en/natal-chart/'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>`;
await writeFile(resolve(ROOT, 'public', 'sitemap-natal.xml'), sitemap, 'utf8');

await vite.close();
console.log(`Сгенерировано ${n} дат + ${signN} знаков + 2 хаба + sitemap (${allUrls.length} URL)`);
