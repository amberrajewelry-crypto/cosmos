import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// SSG натальных страниц (§5.3): грузим TS-модуль через Vite SSR (резолвит импорты как в приложении),
// прогоняем 366 дат × 2 языка, пишем статические HTML в public/ (Vite копирует их в dist как есть).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://cosmos-alpha-three.vercel.app';

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { natalPage, urlFor, signPage, signUrl, ophiuchusPage, ophiuchusUrl } = await vite.ssrLoadModule('/src/natal/page.ts');
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
// Заодно собираем дни, когда Солнце реально в Змееносце (Ophiuchus) — под хаб 13-го знака.
const bySign = Array.from({ length: 12 }, () => []);
const ophDays = [];
for (const [month, day] of dates) {
  const { signIndex, constellationLatin } = sunSignAndConstellation(new Date(Date.UTC(2024, month - 1, day, 12, 0, 0)));
  bySign[signIndex].push({ month, day, constellationLatin });
  if (constellationLatin === 'Ophiuchus') ophDays.push({ month, day, constellationLatin });
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
  const oph = lang === 'ru'
    ? `<section><h2>Змееносец — 13-й знак</h2><p style="opacity:.9"><a href="${ophiuchusUrl(lang)}" style="color:var(--gold)">Настоящий 13-й знак зодиака, который выкинул гороскоп →</a></p></section>`
    : `<section><h2>Ophiuchus — the 13th sign</h2><p style="opacity:.9"><a href="${ophiuchusUrl(lang)}" style="color:var(--gold)">The real 13th zodiac sign the horoscope dropped →</a></p></section>`;
  let body = `<section><h2>${lang === 'ru' ? 'По знаку' : 'By sign'}</h2><div class="days">${signLinks}</div></section>${oph}`;
  for (let month = 1; month <= 12; month++) {
    const links = dates.filter(([m]) => m === month)
      .map(([m, d]) => `<a href="${urlFor(lang, m, d)}">${d}</a>`).join(' ');
    body += `<section><h2>${months[month - 1]}</h2><div class="days">${links}</div></section>`;
  }
  const selfUrl = SITE + (lang === 'ru' ? '/natalnaya-karta/' : '/en/natal-chart/');
  return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${h1} — ${brand}</title>
<meta name="description" content="${lede}"><link rel="canonical" href="${selfUrl}">
<style>
@font-face{font-family:'Geist';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/Geistwght.woff2) format('woff2')}@font-face{font-family:'Geist';font-style:italic;font-weight:100 900;font-display:swap;src:url(/fonts/Geist-Italicwght.woff2) format('woff2')}@font-face{font-family:'Geist Mono';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/GeistMonowght.woff2) format('woff2')}@font-face{font-family:'Geist Fallback';src:local('Helvetica Neue'),local('Arial');size-adjust:98%;ascent-override:92%;descent-override:24%;line-gap-override:0%}@font-face{font-family:'Geist Mono Fallback';src:local('Menlo'),local('Courier New');size-adjust:94%}
:root{--ink:#ece6d3;--ink2:rgba(236,230,211,.68);--gold:#c9a85c;--gold2:rgba(201,168,92,.32);--bg:#0a0820;--serif:'Geist','Geist Fallback',system-ui,sans-serif;--mono:'Geist Mono','Geist Mono Fallback',ui-monospace,Menlo,monospace;--ease:cubic-bezier(.32,.72,0,1)}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(120% 80% at 50% -10%,#1a1340 0%,var(--bg) 60%);color:var(--ink);font-family:var(--serif);line-height:1.6;font-size:18px;-webkit-font-smoothing:antialiased}
body::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:.045;mix-blend-mode:soft-light;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.wrap{max-width:760px;margin:0 auto;padding:36px 22px 80px}
.top{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:11px;letter-spacing:.06em;padding:8px 8px 8px 16px;border-radius:999px;background:rgba(14,11,38,.55);border:1px solid rgba(236,230,211,.08)}
.top a{color:var(--gold);text-decoration:none;padding:6px 10px;border-radius:999px}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(36px,5.6vw,54px);line-height:1.02;letter-spacing:-.01em;color:var(--ink);margin:40px 0 12px}
h1 em,h1 b{font-style:italic;font-weight:400;color:var(--gold)}
h2{font-family:var(--serif);font-weight:500;font-size:26px;color:var(--gold);margin:30px 0 8px}
.lede{font-size:22px;line-height:1.4;margin:14px 0 24px;color:var(--ink2)}
.chart{width:min(78vw,360px);aspect-ratio:1;margin:8px auto 28px;display:block;filter:drop-shadow(0 0 40px rgba(201,168,92,.14))}
.why{font-size:18px;opacity:.94}
.facts{padding:20px 22px;border-radius:18px;background:linear-gradient(180deg,rgba(20,16,52,.78),rgba(12,10,32,.78));border:1px solid rgba(236,230,211,.08);box-shadow:0 0 0 5px rgba(236,230,211,.035),inset 0 1px 0 rgba(255,255,255,.06);margin:30px 5px}
.facts h2{font-size:20px;margin:0 0 10px}
.facts ul{margin:0;padding:0}
.facts li{list-style:none;font-family:var(--mono);font-size:14px;margin:8px 0;color:var(--ink)}
.facts li b{color:var(--gold);font-weight:400}
.note{font-family:var(--mono);font-size:11px;opacity:.55;margin:8px 0 0}
.cta{display:inline-flex;align-items:center;gap:12px;margin:22px 0 10px;font-size:18px;font-weight:500;color:#120f2a;background:var(--gold);padding:8px 8px 8px 22px;border-radius:999px;text-decoration:none;transition:transform .6s var(--ease)}
.cta::after{content:'→';width:34px;height:34px;border-radius:50%;background:rgba(10,8,32,.14);display:grid;place-items:center;font-family:var(--mono);font-size:14px}
.cta:active{transform:scale(.98)}
.privacy{font-family:var(--mono);font-size:11px;opacity:.6}
.days{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.days a{color:var(--ink2);font-family:var(--mono);font-size:12px;text-decoration:none;padding:5px 10px;border-radius:999px;border:1px solid rgba(236,230,211,.08);transition:color .5s var(--ease),border-color .5s var(--ease)}
.days a:hover{color:var(--ink);border-color:var(--gold2)}
.faq{margin:30px 0}
.faq details{border-bottom:1px solid rgba(236,230,211,.1);padding:12px 0}
.faq summary{cursor:pointer;font-size:19px;font-weight:500}
.faq p{font-size:17px;color:var(--ink2);margin:8px 0 0}
section p{color:var(--ink2)}
.tag{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
</style>
</head><body><div class="wrap"><div class="top"><a href="/">${brand}</a></div><h1>${h1}</h1><p class="lede">${lede}</p>${body}</div></body></html>`;
}
await writePage(lang_url('ru'), hub('ru'));
await writePage(lang_url('en'), hub('en'));
function lang_url(lang) { return lang === 'ru' ? '/natalnaya-karta/' : '/en/natal-chart/'; }

// Хаб Змееносца (13-й знак) — под живой suggest-кластер, обе локали.
for (const lang of ['ru', 'en']) {
  await writePage(ophiuchusUrl(lang), ophiuchusPage(lang, ophDays));
  urls[lang].push(ophiuchusUrl(lang));
}

// Sitemap со всеми URL + hreflang-парами.
const allUrls = ['/', ...urls.ru, ...urls.en, '/natalnaya-karta/', '/en/natal-chart/'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>`;
await writeFile(resolve(ROOT, 'public', 'sitemap-natal.xml'), sitemap, 'utf8');

await vite.close();
console.log(`Сгенерировано ${n} дат + ${signN} знаков + 2 хаба + sitemap (${allUrls.length} URL)`);
