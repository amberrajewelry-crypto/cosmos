import { natalSVG } from './chart';
import { precessionOffsetDeg } from '../compute/precession';
import { sunSignAndConstellation, SIGNS_RU, SIGNS_EN, CONST_RU, CONST_EN } from '../compute/sign';

// Программатик «натальная карта родившихся {дата}» (§5.3) под SEO-опору «натальная карта».
// Честный крючок: знак зодиака vs РЕАЛЬНОЕ созвездие Солнца. Обезличено (§3.7): только дата,
// полдень UTC, никаких координат/времени рождения. Долгота Солнца по календарной дате почти не
// зависит от года рождения (дрейф <1.5° за десятилетия) — одна страница честно накрывает всех.
export type Lang = 'ru' | 'en';
const REF_YEAR = 2024; // високосный → дата 29.02 валидна; выбор года не влияет на созвездие

const SITE = 'https://cosmos-alpha-three.vercel.app';
const BRAND = { ru: 'Космос внутри тебя', en: 'The Cosmos Inside You' };
const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const pad = (n: number) => String(n).padStart(2, '0');
export const slug = (month: number, day: number) => `${pad(month)}-${pad(day)}`;
export const urlFor = (lang: Lang, month: number, day: number) =>
  lang === 'ru' ? `/natalnaya-karta/${slug(month, day)}/` : `/en/natal-chart/${slug(month, day)}/`;

export function natalPage(month: number, day: number, lang: Lang): string {
  const when = new Date(Date.UTC(REF_YEAR, month - 1, day, 12, 0, 0));
  const { sunLon, signIndex, constellationLatin, matches } = sunSignAndConstellation(when);
  const precession = precessionOffsetDeg(when);

  const sign = (lang === 'ru' ? SIGNS_RU : SIGNS_EN)[signIndex];
  const constellation = (lang === 'ru' ? CONST_RU : CONST_EN)[constellationLatin] ?? constellationLatin;
  const dateStr = lang === 'ru' ? `${day} ${MONTHS_RU[month - 1]}` : `${MONTHS_EN[month - 1]} ${day}`;
  const svg = natalSVG({ sunLon, rotationDeg: 0 });
  const altUrl = SITE + urlFor(lang === 'ru' ? 'en' : 'ru', month, day);
  const selfUrl = SITE + urlFor(lang, month, day);

  const t = lang === 'ru'
    ? {
        htmlLang: 'ru',
        title: `Натальная карта родившихся ${dateStr} — знак ${sign}, а созвездие ${constellation}`,
        desc: `Тебе говорят, что твой знак — ${sign}. Но ${dateStr} Солнце реально стоит в созвездии ${constellation}. Честная натальная карта без астрологии — только физика.`,
        h1: `Натальная карта: рождённые ${dateStr}`,
        lede: matches
          ? `Редкий случай: ${dateStr} знак зодиака и настоящее созвездие Солнца совпадают — оба «${sign}».`
          : `Тебе всю жизнь говорили: «ты ${sign}». Но ${dateStr} Солнце стоит в созвездии <b>${constellation}</b>, а не там, где знак.`,
        why: `Почему так? Зодиак закрепили ~2000 лет назад. С тех пор из-за прецессии земной оси круг знаков разошёлся с реальными созвездиями примерно на ${precession}°. Знак «${sign}» — это участок неба, где Солнце стояло тогда. Сегодня оно там уже не стоит.`,
        factsH: 'Что на самом деле',
        f1: `Знак зодиака (традиция): <b>${sign}</b>`,
        f2: `Реальное созвездие Солнца: <b>${constellation}</b>`,
        f3: `Сдвиг зодиака от созвездий: <b>~${precession}°</b>`,
        note: 'Расчёт: положение Солнца на полдень UTC этой даты (границы созвездий — IAU, astronomy-engine). Год рождения почти не влияет: за десятилетия Солнце по этой дате смещается меньше чем на градус.',
        cta: 'Открыть свою живую карту космоса →',
        privacy: 'Эта страница ничего о тебе не знает — только дата. Твои координаты и время рождения никуда не уходят.',
        altLabel: 'In English',
      }
    : {
        htmlLang: 'en',
        title: `Natal chart for those born ${dateStr} — sign ${sign}, but constellation ${constellation}`,
        desc: `You are told your sign is ${sign}. But on ${dateStr} the Sun actually sits in the constellation ${constellation}. An honest natal chart with no astrology — just physics.`,
        h1: `Natal chart: born ${dateStr}`,
        lede: matches
          ? `A rare case: on ${dateStr} the zodiac sign and the Sun's real constellation coincide — both “${sign}”.`
          : `All your life you were told “you're a ${sign}”. But on ${dateStr} the Sun sits in the constellation <b>${constellation}</b>, not where the sign says.`,
        why: `Why? The zodiac was fixed ~2000 years ago. Since then, precession of Earth's axis has shifted the ring of signs away from the real constellations by about ${precession}°. The sign “${sign}” marks where the Sun stood back then. Today it no longer stands there.`,
        factsH: 'What is actually true',
        f1: `Zodiac sign (tradition): <b>${sign}</b>`,
        f2: `Sun's real constellation: <b>${constellation}</b>`,
        f3: `Zodiac drift from constellations: <b>~${precession}°</b>`,
        note: 'Computed from the Sun\'s position at noon UTC on this date (constellation boundaries: IAU, astronomy-engine). Birth year barely matters: over decades the Sun on this date moves less than a degree.',
        cta: 'Open your live map of the cosmos →',
        privacy: 'This page knows nothing about you — only the date. Your coordinates and birth time never leave your device.',
        altLabel: 'По-русски',
      };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t.title,
    description: t.desc,
    inLanguage: t.htmlLang,
    isPartOf: { '@type': 'WebSite', name: BRAND[lang], url: SITE },
    mainEntity: {
      '@type': 'Question',
      name: t.title,
      acceptedAnswer: { '@type': 'Answer', text: t.desc },
    },
  };

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.title}</title>
<meta name="description" content="${t.desc}">
<link rel="canonical" href="${selfUrl}">
<link rel="alternate" hreflang="${lang}" href="${selfUrl}">
<link rel="alternate" hreflang="${lang === 'ru' ? 'en' : 'ru'}" href="${altUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${t.desc}">
<meta property="og:url" content="${selfUrl}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='6' fill='%23bfa14a'/></svg>">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root{--ink:#e8e2cf;--gold:#bfa14a;--bg:#141033;--serif:Georgia,'Times New Roman',serif;--mono:'SF Mono',ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--serif);line-height:1.6}
.wrap{max-width:760px;margin:0 auto;padding:32px 22px 64px}
.top{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:12px;opacity:.75}
.top a{color:var(--gold);text-decoration:none}
h1{font-family:var(--mono);font-size:26px;letter-spacing:1px;color:var(--gold);margin:26px 0 6px}
.lede{font-size:21px;line-height:1.4;margin:14px 0 20px}
.chart{width:min(78vw,340px);aspect-ratio:1;margin:8px auto 24px;display:block}
.why{font-size:16px;opacity:.92}
.facts{border:1px solid rgba(191,161,74,.5);border-radius:2px;padding:16px 18px;margin:24px 0}
.facts h2{font-family:var(--serif);font-size:16px;color:var(--gold);margin:0 0 10px}
.facts li{list-style:none;font-family:var(--mono);font-size:14px;margin:6px 0}
.facts ul{margin:0;padding:0}
.note{font-family:var(--mono);font-size:11px;opacity:.55;margin:6px 0 0}
.cta{display:inline-block;margin:22px 0 10px;font-size:16px;color:var(--bg);background:var(--gold);padding:12px 20px;border-radius:2px;text-decoration:none}
.privacy{font-family:var(--mono);font-size:11px;opacity:.6}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><a href="/">${BRAND[lang]}</a><a href="${altUrl}">${t.altLabel}</a></div>
  <h1>${t.h1}</h1>
  <p class="lede">${t.lede}</p>
  <div class="chart">${svg}</div>
  <div class="facts">
    <h2>${t.factsH}</h2>
    <ul><li>${t.f1}</li><li>${t.f2}</li><li>${t.f3}</li></ul>
    <p class="note">${t.note}</p>
  </div>
  <p class="why">${t.why}</p>
  <a class="cta" href="/">${t.cta}</a>
  <p class="privacy">${t.privacy}</p>
</div>
</body>
</html>`;
}
