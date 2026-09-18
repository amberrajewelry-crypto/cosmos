import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// SSG натальных страниц (§5.3): грузим TS-модуль через Vite SSR (резолвит импорты как в приложении),
// прогоняем 366 дат × 2 языка, пишем статические HTML в public/ (Vite копирует их в dist как есть).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://cosmos-alpha-three.vercel.app';

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { natalPage, urlFor, signPage, signUrl, ophiuchusPage, ophiuchusUrl, shell, setStarCatalog } = await vite.ssrLoadModule('/src/natal/page.ts');
setStarCatalog(JSON.parse(readFileSync('public/stars.json', 'utf8')));
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
  const brand = lang === 'ru' ? 'Астроанализ' : 'Astroanalysis';
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
  // FAQ хаба (по структуре астропроцессоров — те же вопросы, честные ответы) + FAQPage JSON-LD; только ru.
  const FAQ = lang === 'ru' ? [
    ['Как рассчитать натальную карту по дате рождения?', 'Введите дату на главной — положения Солнца, Луны и планет считаются в браузере по эфемеридам VSOP87. Время и город добавляют восходящее созвездие и точную Луну.'],
    ['Что показывает карта?', 'Долготу и настоящее созвездие каждого тела (по границам МАС) рядом со знаком гороскопа, расстояния, углы между телами, фазу Луны, звезду, чей свет вышел в год рождения, и досье проверяемых фактов о дне.'],
    ['Почему созвездие не совпадает со знаком?', 'Из-за прецессии земной оси точка отсчёта знаков сместилась почти на 30° за 2100 лет. Совпадение осталось у 11 % дат года.'],
    ['Что делать, если не знаю время рождения?', 'Постройте карту по дате: Солнце и планеты точны, Луна — с погрешностью до 6,5°. Асцендент и MC без времени не показываем — их без него не существует.'],
    ['Есть ли расшифровка?', 'Нет толкований характера и судьбы — их нельзя проверить. Есть таблицы, углы, транзиты, момент возвращения Солнца и сравнение двух дат: всё вычислимое, ничего выдуманного.'],
    ['Какие ещё расчёты есть?', 'Вкладки в карте: «Положения», «Углы», «Сейчас» (транзиты), «Возврат Солнца» (соляр), «Две даты» (синастрия), «Возвраты» планет. Плюс страницы на каждую дату и на каждый день последних ста лет.'],
    ['Безопасно ли вводить данные?', 'Дата, время и город остаются в браузере и не отправляются на сервер. Аккаунтов нет.'],
    ['Насколько точны расчёты?', 'Около одной угловой секунды для планет; проверить можно в JPL Horizons или Stellarium. Каждая константа на сайте имеет источник и статус проверки.'],
  ] : [];
  if (FAQ.length) {
    body += `<section class="faq"><h2>Вопросы</h2>${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
    body += `<p class="privacy"><a href="/kosmogramma/">Космограмма</a> · <a href="/sinastriya/">Синастрия</a> · <a href="/tranzity/">Транзиты</a> · <a href="/solyar/">Соляр</a> · <a href="/direkcii/">Дирекции</a> · <a href="/o-proekte/">О проекте</a></p>`;
    body += `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>`;
  }
  const selfUrl = SITE + (lang === 'ru' ? '/natalnaya-karta/' : '/en/natal-chart/');
  const altUrl = SITE + (lang === 'ru' ? '/en/natal-chart/' : '/natalnaya-karta/');
  return shell(lang, { title: `${h1} — ${brand}`, desc: lede, selfUrl, altUrl, altLabel: lang === 'ru' ? 'In English' : 'По-русски', eyebrow: lang === 'ru' ? 'По дате' : 'By date',
    inner: `<h1>${h1}</h1><p class="lede">${lede}</p>${body}` });
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
const allUrls = ['/', '/karta/', ...urls.ru, ...urls.en, '/natalnaya-karta/', '/en/natal-chart/'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>`;
await writeFile(resolve(ROOT, 'public', 'sitemap-natal.xml'), sitemap, 'utf8');

await vite.close();
console.log(`Сгенерировано ${n} дат + ${signN} знаков + 2 хаба + sitemap (${allUrls.length} URL)`);
