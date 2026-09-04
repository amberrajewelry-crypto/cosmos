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
        title: `Настоящая натальная карта родившихся ${dateStr} — твой реальный знак ${constellation}`,
        desc: `По гороскопу твой знак — ${sign}. Но по настоящему небу ${dateStr} Солнце стоит в созвездии ${constellation} — это твой реальный, сидерический знак. Настоящая натальная карта по звёздам.`,
        h1: `Настоящая натальная карта: ${dateStr}`,
        lede: matches
          ? `${dateStr} традиционный знак и настоящее созвездие Солнца совпадают — оба «${sign}». Так бывает редко.`
          : `Гороскопы говорят, что ты ${sign}. Но по реальному положению звёзд ${dateStr} Солнце стоит в созвездии <b>${constellation}</b> — это и есть твой настоящий знак.`,
        why: `Обычная астрология считает по зодиаку, закреплённому ~2000 лет назад. С тех пор небо сдвинулось на ${precession}° (прецессия земной оси). Настоящая, сидерическая астрология смотрит, где Солнце и звёзды находятся <b>сейчас</b> — поэтому твой реальный знак ${constellation}, а не ${sign}.`,
        factsH: 'Твоя настоящая карта',
        f1: `Знак по гороскопу (тропический): <b>${sign}</b>`,
        f2: `Твой реальный знак (созвездие Солнца): <b>${constellation}</b>`,
        f3: `Насколько небо сдвинулось: <b>~${precession}°</b>`,
        note: 'Рассчитано по реальному положению Солнца на полдень UTC этой даты (границы созвездий — IAU). Год рождения почти не влияет: за десятилетия Солнце по этой дате смещается меньше чем на градус.',
        cta: 'Построить свою живую карту космоса →',
        privacy: 'Эта страница ничего о тебе не знает — только дата. Твои координаты и время рождения никуда не уходят.',
        altLabel: 'In English',
      }
    : {
        htmlLang: 'en',
        title: `Real natal chart for those born ${dateStr} — your true sign ${constellation}`,
        desc: `Your horoscope says ${sign}. But by the real sky, on ${dateStr} the Sun sits in the constellation ${constellation} — that is your true, sidereal sign. A real star-based natal chart.`,
        h1: `Real natal chart: ${dateStr}`,
        lede: matches
          ? `On ${dateStr} the traditional sign and the Sun's real constellation coincide — both “${sign}”. That's rare.`
          : `Horoscopes say you're a ${sign}. But by the real position of the stars, on ${dateStr} the Sun sits in the constellation <b>${constellation}</b> — that is your true sign.`,
        why: `Ordinary astrology uses a zodiac fixed ~2000 years ago. Since then the sky has shifted by ${precession}° (axial precession). Real, sidereal astrology looks at where the Sun and stars are <b>now</b> — so your true sign is ${constellation}, not ${sign}.`,
        factsH: 'Your real chart',
        f1: `Horoscope sign (tropical): <b>${sign}</b>`,
        f2: `Your true sign (Sun's constellation): <b>${constellation}</b>`,
        f3: `How far the sky has shifted: <b>~${precession}°</b>`,
        note: 'Computed from the Sun\'s real position at noon UTC on this date (constellation boundaries: IAU). Birth year barely matters: over decades the Sun on this date moves less than a degree.',
        cta: 'Build your live map of the cosmos →',
        privacy: 'This page knows nothing about you — only the date. Your coordinates and birth time never leave your device.',
        altLabel: 'По-русски',
      };

  // FAQ с ответами из вычисленных фактов (уникальны для каждой даты → уникальность против thin-content
  // + право на FAQ-rich-сниппет). Ophiuchus/Змееносец — отдельный вопрос-крючок (13-й знак).
  const isOphiuchus = constellationLatin === 'Ophiuchus';
  const faq: Array<[string, string]> = lang === 'ru'
    ? [
        [`Какой мой настоящий знак, если я родился ${dateStr}?`,
         `По реальному положению Солнца твой знак — ${constellation}. Гороскоп называет «${sign}», но небо сдвинулось на ~${precession}° за две тысячи лет.`],
        [`Почему знак по гороскопу и настоящий знак не совпадают?`,
         `Гороскопный зодиак закрепили около 2000 лет назад. Из-за прецессии земной оси созвездия сместились примерно на ${precession}°, поэтому Солнце сегодня стоит не там, где говорит гороскоп.`],
        ...(isOphiuchus ? [[`Змееносец — правда 13-й знак зодиака?`,
         `Да. Солнце ${dateStr} реально проходит через созвездие Змееносец — его гороскоп просто не учитывает, хотя астрономически это полноценное зодиакальное созвездие.`] as [string, string]] : []),
      ]
    : [
        [`What is my true sign if I was born on ${dateStr}?`,
         `By the Sun's real position your sign is ${constellation}. Horoscopes say “${sign}”, but the sky has shifted by ~${precession}° over two thousand years.`],
        [`Why don't the horoscope sign and the true sign match?`,
         `The horoscope zodiac was fixed about 2000 years ago. Axial precession moved the constellations by about ${precession}°, so today the Sun no longer stands where the horoscope says.`],
        ...(isOphiuchus ? [[`Is Ophiuchus really the 13th zodiac sign?`,
         `Yes. On ${dateStr} the Sun really passes through the constellation Ophiuchus — horoscopes simply ignore it, though astronomically it is a full zodiac constellation.`] as [string, string]] : []),
      ];
  const faqHtml = `<div class="faq"><h2>${lang === 'ru' ? 'Частые вопросы' : 'FAQ'}</h2>${
    faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
  const faqLd = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  })}</script>`;

  const inner = `
  <h1>${t.h1}</h1>
  <p class="lede">${t.lede}</p>
  <div class="chart">${svg}</div>
  <div class="facts">
    <h2>${t.factsH}</h2>
    <ul><li>${t.f1}</li><li>${t.f2}</li><li>${t.f3}</li></ul>
    <p class="note">${t.note}</p>
  </div>
  <p class="why">${t.why}</p>
  ${faqHtml}${faqLd}
  <a class="cta" href="/">${t.cta}</a>
  <p class="privacy">${t.privacy}</p>`;

  return shell(lang, { title: t.title, desc: t.desc, selfUrl, altUrl, altLabel: t.altLabel, inner });
}

// Общая HTML-оболочка (DRY): голова с SEO-тегами + тёмная тема. bodyInner вставляется в .wrap.
interface Shell { title: string; desc: string; selfUrl: string; altUrl: string; altLabel: string; inner: string; }
function shell(lang: Lang, s: Shell): string {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.desc,
    inLanguage: lang, isPartOf: { '@type': 'WebSite', name: BRAND[lang], url: SITE },
    mainEntity: { '@type': 'Question', name: s.title, acceptedAnswer: { '@type': 'Answer', text: s.desc } },
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${s.title}</title>
<meta name="description" content="${s.desc}">
<link rel="canonical" href="${s.selfUrl}">
<link rel="alternate" hreflang="${lang}" href="${s.selfUrl}">
<link rel="alternate" hreflang="${lang === 'ru' ? 'en' : 'ru'}" href="${s.altUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${s.title}">
<meta property="og:description" content="${s.desc}">
<meta property="og:url" content="${s.selfUrl}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${s.title}">
<meta name="twitter:image" content="${SITE}/og.png">
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
.days{display:flex;flex-wrap:wrap;gap:4px 10px;margin:10px 0}
.days a{color:var(--ink);font-family:var(--mono);font-size:13px;text-decoration:none;opacity:.85}
.days a:hover{color:var(--gold)}
.faq{margin:26px 0}
.faq h2{color:var(--gold);font-size:17px;margin:0 0 8px}
.faq details{border-bottom:1px solid rgba(191,161,74,.25);padding:10px 0}
.faq summary{cursor:pointer;font-size:16px}
.faq p{font-size:15px;opacity:.9;margin:8px 0 0}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><a href="/">${BRAND[lang]}</a><a href="${s.altUrl}">${s.altLabel}</a></div>${s.inner}
</div>
</body>
</html>`;
}

// --- Страницы знаков «натальная карта {знак} расшифровка» (long-tail) ---
export const SIGN_SLUG_RU = ['oven','telec','bliznecy','rak','lev','deva','vesy','skorpion','strelec','kozerog','vodolej','ryby'];
export const SIGN_SLUG_EN = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
export const signUrl = (lang: Lang, i: number) =>
  lang === 'ru' ? `/natalnaya-karta/znak/${SIGN_SLUG_RU[i]}/` : `/en/natal-chart/sign/${SIGN_SLUG_EN[i]}/`;

export interface SignDay { month: number; day: number; constellationLatin: string; }

// entries — все даты этого знака (из генератора), с реальным созвездием Солнца на каждую.
export function signPage(signIndex: number, lang: Lang, entries: SignDay[]): string {
  const sign = (lang === 'ru' ? SIGNS_RU : SIGNS_EN)[signIndex];
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  const constMap = lang === 'ru' ? CONST_RU : CONST_EN;
  // Козерог пересекает Новый год: даты идут Янв→Дек, переставим декабрьскую часть вперёд, чтобы
  // период читался «22 декабря — 19 января», а не «1 января — 31 декабря».
  const wraps = entries.some((e) => e.month === 12) && entries.some((e) => e.month === 1);
  const ord = wraps ? [...entries.filter((e) => e.month >= 7), ...entries.filter((e) => e.month < 7)] : entries;
  const first = ord[0], last = ord[ord.length - 1];
  const span = lang === 'ru'
    ? `${first.day} ${months[first.month - 1]} — ${last.day} ${months[last.month - 1]}`
    : `${months[first.month - 1]} ${first.day} — ${months[last.month - 1]} ${last.day}`;
  // Реальные созвездия, где Солнце бывает за период знака (обычно 1–2 из-за прецессии).
  const realConsts = [...new Set(entries.map((e) => constMap[e.constellationLatin] ?? e.constellationLatin))];
  const dayLinks = ord
    .map((e) => `<a href="${urlFor(lang, e.month, e.day)}">${lang === 'ru' ? e.day + ' ' + months[e.month - 1] : months[e.month - 1] + ' ' + e.day}</a>`)
    .join(' ');
  const selfUrl = SITE + signUrl(lang, signIndex);
  const altUrl = SITE + signUrl(lang === 'ru' ? 'en' : 'ru', signIndex);

  const t = lang === 'ru'
    ? {
        title: `Настоящая натальная карта, знак ${sign} — твой реальный знак по звёздам`,
        desc: `По гороскопу ${sign} — это ${span}. Но по настоящему небу Солнце в эти дни в созвездии ${realConsts.join(', ')} — это твой реальный, сидерический знак.`,
        h1: `Знак ${sign}: твой настоящий знак`,
        lede: `По гороскопу даты ${sign} — ${span}. Но по реальному положению звёзд Солнце в эти дни стоит в созвездии ${realConsts.join(' и ')} — вот твой настоящий знак.`,
        decodeH: 'Настоящая астрология',
        decode: `Обычный гороскоп берёт знак по дате рождения. Настоящая, сидерическая астрология смотрит, где Солнце реально стоит среди звёзд. Для ${sign} гороскоп и небо разошлись — вот доказательство по дням.`,
        daysH: 'Найди свой день',
        cta: 'Построить живую карту космоса →',
        altLabel: 'In English',
      }
    : {
        title: `Real natal chart, ${sign} — your true sign by the stars`,
        desc: `By horoscope ${sign} is ${span}. But by the real sky the Sun in these days sits in ${realConsts.join(', ')} — that is your true, sidereal sign.`,
        h1: `${sign}: your true sign`,
        lede: `By horoscope the dates for ${sign} are ${span}. But by the real position of the stars the Sun in these days sits in ${realConsts.join(' and ')} — that is your true sign.`,
        decodeH: 'Real astrology',
        decode: `An ordinary horoscope takes your sign by birth date. Real, sidereal astrology looks at where the Sun actually stands among the stars. For ${sign} the horoscope and the sky have parted — here is the day-by-day proof.`,
        daysH: 'Find your day',
        cta: 'Build the live map of the cosmos →',
        altLabel: 'По-русски',
      };

  const inner = `
  <h1>${t.h1}</h1>
  <p class="lede">${t.lede}</p>
  <div class="facts">
    <h2>${t.decodeH}</h2>
    <p class="why">${t.decode}</p>
  </div>
  <h2 style="color:var(--gold);font-size:17px">${t.daysH}</h2>
  <div class="days">${dayLinks}</div>
  <a class="cta" href="/">${t.cta}</a>`;

  return shell(lang, { title: t.title, desc: t.desc, selfUrl, altUrl, altLabel: t.altLabel, inner });
}
