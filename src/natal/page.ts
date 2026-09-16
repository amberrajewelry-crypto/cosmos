import { natalSVG } from './chart';
import { precessionOffsetDeg } from '../compute/precession';
import { sunSignAndConstellation, SIGNS_RU, SIGNS_EN, CONST_RU, CONST_EN } from '../compute/sign';
import { natalBodies } from '../compute/natalbodies';
import { dossier } from './dossier';
import { dateFacts } from './datefacts';
import { Illumination, Body, Equator, Observer, Constellation } from 'astronomy-engine';

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
  const df = dateFacts(REF_YEAR, month, day);

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

  // Небо этой даты (уникальные числа против thin-content): склонение, расстояние, скорость, окно созвездия, метеоры.
  const fmtDate = (d: Date) => lang === 'ru' ? `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]}` : `${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const n1 = (x: number) => x.toFixed(1), n2 = (x: number) => x.toFixed(2);
  const north = df.dec > 0;
  const showersTxt = df.showers.length
    ? df.showers.map((sh) => `${lang === 'ru' ? sh.ru : sh.en} (${lang === 'ru' ? 'максимум' : 'peak'} ${fmtDate(new Date(Date.UTC(REF_YEAR, sh.peak[0] - 1, sh.peak[1])))}, ZHR ${sh.zhr})`).join('; ')
    : (lang === 'ru' ? 'крупных потоков нет — небо для тихих звёзд' : 'no major showers — a night for quiet stars');
  const sky = lang === 'ru'
    ? [`Солнце в созвездии ${constellation} с <b>${fmtDate(df.entered)}</b> по <b>${fmtDate(df.leaves)}</b> — ${df.spanDays} дней; от точки весеннего равноденствия по эклиптике пройдено ${n1(df.sunLon)}°.`,
       `Склонение Солнца <b>${n1(df.dec)}°</b>: ${north ? 'день длиннее ночи в северном полушарии' : 'ночь длиннее дня в северном полушарии'}${Math.abs(df.dec) < 1 ? ' — почти равноденствие' : ''}.`,
       `Земля в этот день в <b>${n2(df.distAu * 149.597870700)} млн км</b> от Солнца (${df.distAu.toFixed(3)} а.е.) и летит по орбите <b>${n2(df.speedKms)} км/с</b>${df.speedKms > 30 ? ' — быстрее среднего: зима северного полушария ближе к перигелию' : df.speedKms < 29.5 ? ' — медленнее среднего: лето северного полушария ближе к афелию' : ''}.`,
       `Метеорные потоки в этот день: ${showersTxt}.`]
    : [`The Sun sits in ${constellation} from <b>${fmtDate(df.entered)}</b> to <b>${fmtDate(df.leaves)}</b> — ${df.spanDays} days; its ecliptic longitude is ${n1(df.sunLon)}°.`,
       `Solar declination <b>${n1(df.dec)}°</b>: ${north ? 'days are longer than nights in the northern hemisphere' : 'nights are longer than days in the northern hemisphere'}${Math.abs(df.dec) < 1 ? ' — almost an equinox' : ''}.`,
       `Earth is <b>${n2(df.distAu * 149.597870700)} million km</b> from the Sun (${df.distAu.toFixed(3)} AU), moving at <b>${n2(df.speedKms)} km/s</b>${df.speedKms > 30 ? ' — faster than average, near perihelion' : df.speedKms < 29.5 ? ' — slower than average, near aphelion' : ''}.`,
       `Meteor showers active today: ${showersTxt}.`];
  const skyHtml = `<div class="facts"><h2>${lang === 'ru' ? `Небо ${dateStr}: цифры, которые не зависят от года` : `The sky on ${dateStr}: numbers that do not depend on the year`}</h2><ul>${sky.map((x) => `<li>${x}</li>`).join('')}</ul>
    <p class="note">${lang === 'ru' ? 'Эфемериды astronomy-engine (VSOP87, сверено с JPL Horizons); метеорные потоки — рабочий список IMO.' : 'Ephemerides: astronomy-engine (VSOP87, checked against JPL Horizons); meteor showers: IMO working list.'}</p></div>`;
  faq.push(lang === 'ru'
    ? [`Когда Солнце входит в созвездие ${constellation} и выходит из него?`, `В опорном году Солнце входит в ${constellation} ${fmtDate(df.entered)} и выходит ${fmtDate(df.leaves)} — всего ${df.spanDays} дней. Границы созвездий — IAU 1930, они неравные, поэтому «знаки» разной длины.`]
    : [`When does the Sun enter and leave ${constellation}?`, `In the reference year the Sun enters ${constellation} on ${fmtDate(df.entered)} and leaves on ${fmtDate(df.leaves)} — ${df.spanDays} days. Constellation boundaries are the IAU 1930 ones and are unequal, so the “signs” differ in length.`]);
  // Соседние даты и страница знака — перелинковка кластера.
  const prev = new Date(Date.UTC(REF_YEAR, month - 1, day - 1)), next = new Date(Date.UTC(REF_YEAR, month - 1, day + 1));
  const navHtml = `<nav class="dates"><a href="${urlFor(lang, prev.getUTCMonth() + 1, prev.getUTCDate())}">← ${fmtDate(prev)}</a><a href="${signUrl(lang, signIndex)}">${lang === 'ru' ? `все даты знака ${sign}` : `all ${sign} dates`}</a><a href="${urlFor(lang, next.getUTCMonth() + 1, next.getUTCDate())}">${fmtDate(next)} →</a></nav>`;
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
  ${skyHtml}
  ${isOphiuchus ? `<p class="why"><a href="${ophiuchusUrl(lang)}" style="color:var(--gold)">${lang === 'ru' ? 'Твоё созвездие — Змееносец, настоящий 13-й знак зодиака →' : 'Your constellation is Ophiuchus — the real 13th zodiac sign →'}</a></p>` : ''}
  ${faqHtml}${faqLd}
  <a class="cta" href="/">${t.cta}</a>
  ${navHtml}
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
@font-face{font-family:'Geist';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/Geistwght.woff2) format('woff2')}@font-face{font-family:'Geist';font-style:italic;font-weight:100 900;font-display:swap;src:url(/fonts/Geist-Italicwght.woff2) format('woff2')}@font-face{font-family:'Unbounded';font-style:normal;font-weight:200 900;font-display:swap;src:url(/fonts/Unboundedwght.woff2) format('woff2')}@font-face{font-family:'Geist Mono';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/GeistMonowght.woff2) format('woff2')}@font-face{font-family:'Geist Fallback';src:local('Helvetica Neue'),local('Arial');size-adjust:98%;ascent-override:92%;descent-override:24%;line-gap-override:0%}@font-face{font-family:'Geist Mono Fallback';src:local('Menlo'),local('Courier New');size-adjust:94%}
:root{--ink:#ece6d3;--ink2:rgba(236,230,211,.68);--gold:#c9a85c;--gold2:rgba(201,168,92,.32);--bg:#0a0820;--display:'Unbounded','Geist','Geist Fallback',system-ui,sans-serif;--serif:'Geist','Geist Fallback',system-ui,sans-serif;--mono:'Geist Mono','Geist Mono Fallback',ui-monospace,Menlo,monospace;--ease:cubic-bezier(.32,.72,0,1)}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(120% 80% at 50% -10%,#1a1340 0%,var(--bg) 60%);color:var(--ink);font-family:var(--serif);line-height:1.6;font-size:18px;-webkit-font-smoothing:antialiased}
body::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:.045;mix-blend-mode:soft-light;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.wrap{max-width:760px;margin:0 auto;padding:36px 22px 80px}
.top{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:11px;letter-spacing:.06em;padding:8px 8px 8px 16px;border-radius:999px;background:rgba(14,11,38,.55);border:1px solid rgba(236,230,211,.08)}
.top a{color:var(--gold);text-decoration:none;padding:6px 10px;border-radius:999px}
h1{font-family:var(--display);font-weight:300;font-size:clamp(26px,3.6vw,40px);line-height:1.12;letter-spacing:-.02em;text-wrap:balance;text-align:center;color:var(--ink);margin:40px 0 12px}
h1 em,h1 b{font-style:italic;font-weight:400;color:var(--gold)}
h2{font-family:var(--display);font-weight:300;font-size:20px;text-align:center;color:var(--gold);margin:30px 0 8px}
.lede{font-size:22px;line-height:1.4;margin:14px 0 24px;color:var(--ink2)}
.chart{width:min(78vw,360px);aspect-ratio:1;margin:8px auto 28px;display:block;filter:drop-shadow(0 0 40px rgba(201,168,92,.14))}
.why{font-size:18px;opacity:.94}
.facts{padding:20px 22px;border-radius:18px;background:linear-gradient(180deg,rgba(20,16,52,.78),rgba(12,10,32,.78));border:1px solid rgba(236,230,211,.08);box-shadow:0 0 0 5px rgba(236,230,211,.035),inset 0 1px 0 rgba(255,255,255,.06);margin:30px 5px}
.facts h2{font-size:20px;margin:0 0 10px}
.dossier ol{list-style:none;margin:0;padding:0;display:grid;gap:8px;counter-reset:d}.dossier li{position:relative;padding:12px 14px 12px 40px;border-radius:16px;background:rgba(236,230,211,.035);border:1px solid rgba(236,230,211,.07)}.dossier li::before{counter-increment:d;content:counter(d,decimal-leading-zero);position:absolute;left:14px;top:13px;font-family:var(--mono);font-size:10px;color:var(--gold)}.dossier li b{display:block;font-size:14px;margin:0 0 4px}.dossier li .tag{position:absolute;right:12px;top:12px}.dossier li p{margin:0;font-size:14px;line-height:1.45}.dossier li small{display:block;margin-top:5px;font-family:var(--mono);font-size:10px;opacity:.7}
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
.dates{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:26px 0 8px;font-size:14px}.dates a{color:var(--gold);text-decoration:none;border-bottom:1px solid rgba(214,180,106,.35)}
.faq details{border-bottom:1px solid rgba(236,230,211,.1);padding:12px 0}
.faq summary{cursor:pointer;font-size:19px;font-weight:500}
.faq p{font-size:17px;color:var(--ink2);margin:8px 0 0}
section p{color:var(--ink2)}
.tag{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
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
  <h2>${t.daysH}</h2>
  <div class="days">${dayLinks}</div>
  <a class="cta" href="/">${t.cta}</a>`;

  return shell(lang, { title: t.title, desc: t.desc, selfUrl, altUrl, altLabel: t.altLabel, inner });
}

// --- Хаб Змееносца — 13-й знак (§4.8-крючок под живой suggest-кластер «змееносец…»). ---
// Отвечает ровно на реальные запросы: «с какого по какое число», «даты», «созвездие», «13-й знак»,
// «гороскоп». Даты берутся из вычисленного положения Солнца (не выдуманы) → честно и уникально.
export const ophiuchusUrl = (lang: Lang) =>
  lang === 'ru' ? '/natalnaya-karta/zmeenosec/' : '/en/natal-chart/ophiuchus/';

// entries — все даты года, когда Солнце реально в созвездии Ophiuchus (из генератора).
export function ophiuchusPage(lang: Lang, entries: SignDay[]): string {
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  // Змееносец лежит в конце ноября — середине декабря, Новый год не пересекает → порядок как есть.
  const ord = [...entries].sort((a, b) => a.month * 100 + a.day - (b.month * 100 + b.day));
  const first = ord[0], last = ord[ord.length - 1];
  const fmt = (e: SignDay) => lang === 'ru' ? `${e.day} ${months[e.month - 1]}` : `${months[e.month - 1]} ${e.day}`;
  const span = `${fmt(first)} — ${fmt(last)}`;
  const nDays = ord.length;
  const dayLinks = ord.map((e) => `<a href="${urlFor(lang, e.month, e.day)}">${fmt(e)}</a>`).join(' ');
  const selfUrl = SITE + ophiuchusUrl(lang);
  const altUrl = SITE + ophiuchusUrl(lang === 'ru' ? 'en' : 'ru');

  const t = lang === 'ru'
    ? {
        title: `Змееносец — 13-й знак зодиака: даты, какой месяц, характеристика, совместимость`,
        desc: `Змееносец — реальный 13-й знак зодиака. Солнце проходит через него ${span} (${nDays} дней). Честно про даты, стихию, характеристику и совместимость — без выдуманных гороскопов.`,
        h1: `Змееносец — настоящий 13-й знак`,
        lede: `Между Скорпионом и Стрельцом Солнце реально проходит через <b>Змееносца</b> (лат. Ophiuchus). Это <b>${span}</b> — примерно ${nDays} дней. Гороскоп из 12 знаков его просто выкинул.`,
        whenH: `С какого по какое число Змееносец`,
        when: `Солнце находится в созвездии Змееносец с <b>${fmt(first)}</b> по <b>${fmt(last)}</b>. Даты рассчитаны по реальному положению Солнца (границы созвездий — IAU), а не по традиционному зодиаку.`,
        whatH: `Что это за созвездие`,
        what: `Змееносец — крупное экваториальное созвездие, изображающее человека, держащего змею. Эклиптика (путь Солнца по небу) проходит через него — поэтому Солнце астрономически бывает «в Змееносце» каждый год, как и в остальных 12 знаках.`,
        whyH: `Почему гороскоп не считает Змееносца`,
        why: `Зодиак из 12 знаков закрепили ~2000 лет назад и поделили небо на 12 равных долей по 30°. Но настоящих зодиакальных созвездий, через которые проходит Солнце, — тринадцать. Змееносец не вписался в ровную «дюжину», и его молча выкинули. Астрономически он ничем не хуже Скорпиона.`,
        monthH: `Какой это месяц и какая стихия`,
        month: `Змееносец — это конец ноября и первая половина декабря (${span}). А вот стихии у него <b>нет</b>: огонь, земля, воздух и вода придуманы, чтобы ровно поделить 12 знаков. Змееносец в эту систему не входил — ещё одно доказательство, что 13-й знак выкинули ради красивого числа, а не по звёздам.`,
        charH: `Характеристика знака Змееносец — честно`,
        char: `Готовой «характеристики Змееносца» не существует — и это честный ответ. Черты характера по знаку не подтверждаются проверками: люди одинаково узнают себя в любом описании (эффект Барнума). А у Змееносца нет даже многовековой традиции таких описаний — гороскоп его не считал. Поэтому вместо выдуманных черт «женщина-Змееносец такая, мужчина-Змееносец сякой» мы даём то, что реально твоё: точное небо над днём твоего рождения.`,
        compatH: `Совместимость и гороскоп на 2026`,
        compat: `Совместимость по знакам не имеет доказанной основы — ни для 12 знаков, ни для Змееносца. И предсказаний «на 2026 год» мы не пишем: их нельзя проверить. Честный «гороскоп Змееносца» — это где Солнце и планеты стоят на самом деле. Вот это и посчитаем.`,
        daysH: `Найди свой день в Змееносце`,
        cta: 'Построить свою живую карту космоса →',
        altLabel: 'In English',
        faq: [
          [`Змееносец — с какого по какое число?`, `Солнце проходит через созвездие Змееносец с ${fmt(first)} по ${fmt(last)} — примерно ${nDays} дней. Это реальные астрономические даты, не гороскопные.`],
          [`Змееносец — это какой месяц?`, `Конец ноября — первая половина декабря: с ${fmt(first)} по ${fmt(last)}.`],
          [`Какая стихия у Змееносца?`, `Никакой. Стихии придумали для ровной системы из 12 знаков, а Змееносец в неё не входил — поэтому «стихии Змееносца» не существует.`],
          [`Змееносец — это правда 13-й знак зодиака?`, `Да. Через него реально проходит путь Солнца (эклиптика), как и через остальные 12 созвездий. Гороскоп из 12 знаков просто не стал его включать.`],
          [`Какая характеристика у женщины и мужчины Змееносца?`, `Проверяемой характеристики по этому (и любому) знаку нет — совпадения объясняются эффектом Барнума. Уникально в человеке не «знак», а реальное небо в его дату рождения.`],
          [`Какой знак был бы у меня, если бы считали Змееносца?`, `Если ты родился с ${fmt(first)} по ${fmt(last)}, по реальному небу твоё созвездие Солнца — Змееносец, а не Стрелец или Скорпион, как говорит гороскоп.`],
        ] as Array<[string, string]>,
      }
    : {
        title: `Ophiuchus — the 13th zodiac sign: dates, month, traits, compatibility`,
        desc: `Ophiuchus is the real 13th zodiac sign. The Sun passes through it ${span} (${nDays} days). Honest answers on dates, element, traits and compatibility — no invented horoscopes.`,
        h1: `Ophiuchus — the real 13th sign`,
        lede: `Between Scorpius and Sagittarius the Sun really passes through <b>Ophiuchus</b>. That is <b>${span}</b> — about ${nDays} days. The 12-sign horoscope simply dropped it.`,
        whenH: `Ophiuchus dates — when it starts and ends`,
        when: `The Sun sits in the constellation Ophiuchus from <b>${fmt(first)}</b> to <b>${fmt(last)}</b>. These dates are computed from the Sun's real position (constellation boundaries: IAU), not the traditional zodiac.`,
        whatH: `What constellation is it`,
        what: `Ophiuchus is a large equatorial constellation depicting a man holding a serpent. The ecliptic (the Sun's path across the sky) runs through it — so the Sun is astronomically "in Ophiuchus" every year, just like the other 12 signs.`,
        whyH: `Why horoscopes ignore Ophiuchus`,
        why: `The 12-sign zodiac was fixed ~2000 years ago, splitting the sky into 12 equal 30° slices. But there are thirteen real zodiac constellations the Sun passes through. Ophiuchus didn't fit the neat "dozen", so it was quietly dropped. Astronomically it is no lesser than Scorpius.`,
        monthH: `What month and what element`,
        month: `Ophiuchus is late November through mid-December (${span}). And it has <b>no element</b>: fire, earth, air and water were invented to divide 12 signs evenly. Ophiuchus was never in that system — more proof the 13th sign was dropped for a round number, not for the stars.`,
        charH: `Ophiuchus traits — honestly`,
        char: `There is no ready "Ophiuchus personality" — and that's the honest answer. Star-sign traits don't survive testing: people recognise themselves equally in any description (the Barnum effect). Ophiuchus doesn't even have centuries of such descriptions — the horoscope never counted it. So instead of invented "an Ophiuchus woman is like this, a man is like that", we give you what's really yours: the exact sky over your birth date.`,
        compatH: `Compatibility and 2026 horoscope`,
        compat: `Sign compatibility has no proven basis — not for the 12 signs, not for Ophiuchus. And we don't write "2026" predictions: they can't be verified. The honest "Ophiuchus horoscope" is where the Sun and planets actually are. That's what we compute.`,
        daysH: `Find your day in Ophiuchus`,
        cta: 'Build your live map of the cosmos →',
        altLabel: 'По-русски',
        faq: [
          [`Ophiuchus — when does it start and end?`, `The Sun passes through Ophiuchus from ${fmt(first)} to ${fmt(last)} — about ${nDays} days. These are real astronomical dates, not horoscope ones.`],
          [`What month is Ophiuchus?`, `Late November to mid-December: from ${fmt(first)} to ${fmt(last)}.`],
          [`What element is Ophiuchus?`, `None. Elements were invented for a tidy 12-sign system, and Ophiuchus was never part of it — so an "Ophiuchus element" doesn't exist.`],
          [`Is Ophiuchus really the 13th zodiac sign?`, `Yes. The Sun's path (the ecliptic) really runs through it, just as through the other 12 constellations. The 12-sign horoscope simply chose not to include it.`],
          [`What are the traits of an Ophiuchus woman or man?`, `There's no testable trait set for this (or any) sign — matches are the Barnum effect. What's unique in a person isn't the "sign" but the real sky on their birth date.`],
          [`What sign would I be if Ophiuchus were counted?`, `If you were born between ${fmt(first)} and ${fmt(last)}, by the real sky your Sun's constellation is Ophiuchus — not Sagittarius or Scorpius as the horoscope says.`],
        ] as Array<[string, string]>,
      };

  const faqHtml = `<div class="faq"><h2>${lang === 'ru' ? 'Частые вопросы' : 'FAQ'}</h2>${
    t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
  const faqLd = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  })}</script>`;

  const inner = `
  <h1>${t.h1}</h1>
  <p class="lede">${t.lede}</p>
  <div class="facts">
    <h2>${t.whenH}</h2>
    <p class="why">${t.when}</p>
  </div>
  <h2>${t.whatH}</h2>
  <p class="why">${t.what}</p>
  <h2>${t.whyH}</h2>
  <p class="why">${t.why}</p>
  <h2>${t.monthH}</h2>
  <p class="why">${t.month}</p>
  <h2>${t.charH}</h2>
  <p class="why">${t.char}</p>
  <h2>${t.compatH}</h2>
  <p class="why">${t.compat}</p>
  <h2>${t.daysH}</h2>
  <div class="days">${dayLinks}</div>
  ${faqHtml}${faqLd}
  <a class="cta" href="/">${t.cta}</a>`;

  return shell(lang, { title: t.title, desc: t.desc, selfUrl, altUrl, altLabel: t.altLabel, inner });
}


// §5.3 /nebo/{дата}: реальное небо на конкретную дату (с годом) за 100 лет. Рендерится по запросу
// (serverless api/nebo.ts), не статикой — 36 500 файлов не нужны. Полдень UTC, без координат (§3.7).
export const NEBO_YEARS: [number, number] = [1926, 2026];
export const neboUrl = (lang: Lang, iso: string) => (lang === 'ru' ? `/nebo/${iso}/` : `/en/sky/${iso}/`);
const BODY_EN: Record<string, string> = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
const BODY_ASTRO: Record<string, Body> = { sun: Body.Sun, moon: Body.Moon, mercury: Body.Mercury, venus: Body.Venus, mars: Body.Mars, jupiter: Body.Jupiter, saturn: Body.Saturn };

export function neboPage(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  const when = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const { sunLon, signIndex, constellationLatin, matches } = sunSignAndConstellation(when);
  const precession = precessionOffsetDeg(when);
  const bodies = natalBodies(when);
  const obs = new Observer(0, 0, 0);
  const rows = bodies.map((b) => {
    const eq = Equator(BODY_ASTRO[b.key], when, obs, false, false);
    const c = Constellation(eq.ra, eq.dec).name;
    const sign = (lang === 'ru' ? SIGNS_RU : SIGNS_EN)[Math.floor(b.lon / 30) % 12];
    const con = (lang === 'ru' ? CONST_RU : CONST_EN)[c] ?? c;
    return `<li>${b.glyph}︎ ${lang === 'ru' ? b.name : BODY_EN[b.key]} — <b>${b.lon.toFixed(1)}°</b> · ${lang === 'ru' ? 'знак' : 'sign'} ${sign} · ${lang === 'ru' ? 'созвездие' : 'constellation'} <b>${con}</b></li>`;
  });
  const moon = Illumination(Body.Moon, when).phase_fraction;
  const sign = (lang === 'ru' ? SIGNS_RU : SIGNS_EN)[signIndex];
  const constellation = (lang === 'ru' ? CONST_RU : CONST_EN)[constellationLatin] ?? constellationLatin;
  const dateStr = lang === 'ru' ? `${d} ${MONTHS_RU[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${d}, ${y}`;
  const svg = natalSVG({ sunLon, rotationDeg: 0, bodies: bodies.map((b) => ({ glyph: b.glyph, lon: b.lon, key: b.key })) });
  const selfUrl = SITE + neboUrl(lang, iso), altUrl = SITE + neboUrl(lang === 'ru' ? 'en' : 'ru', iso);
  const t = lang === 'ru' ? {
    title: `Небо ${dateStr}: где реально были Солнце, Луна и планеты`,
    desc: `Реальное небо ${dateStr}: Солнце в созвездии ${constellation} (гороскоп говорит «${sign}»), Луна освещена на ${Math.round(moon * 100)} %, положения планет по эфемеридам.`,
    h1: `Небо <em>${dateStr}</em> — как было на самом деле`,
    lede: matches ? `В этот день Солнце стояло в созвездии ${constellation} — здесь знак и созвездие совпали.` : `В этот день Солнце стояло в созвездии <b>${constellation}</b>, а гороскоп называет «${sign}». Расхождение — ${precession.toFixed(1)}° прецессии.`,
    factsH: 'Тела на эклиптике (полдень UTC)', moonL: `Луна освещена на <b>${Math.round(moon * 100)} %</b>`,
    note: 'Эфемериды astronomy-engine (VSOP87/ELP), границы созвездий IAU 1930. Точность положений — доли градуса.',
    cta: 'Своя карта с временем и местом', altLabel: 'English', privacy: 'Страница считается по дате; ничего о тебе не хранится.',
    hub: 'Другие даты', app: 'Открыть в приложении',
  } : {
    title: `Sky on ${dateStr}: where the Sun, Moon and planets really were`,
    desc: `The real sky on ${dateStr}: Sun in ${constellation} (horoscope says "${sign}"), Moon ${Math.round(moon * 100)}% lit, planet positions from ephemerides.`,
    h1: `The sky on <em>${dateStr}</em> — as it really was`,
    lede: matches ? `That day the Sun stood in ${constellation} — sign and constellation agree here.` : `That day the Sun stood in <b>${constellation}</b>, while the horoscope says "${sign}". The gap is ${precession.toFixed(1)}° of precession.`,
    factsH: 'Bodies on the ecliptic (noon UTC)', moonL: `Moon <b>${Math.round(moon * 100)}%</b> illuminated`,
    note: 'astronomy-engine ephemerides (VSOP87/ELP), IAU 1930 constellation boundaries. Positions accurate to a fraction of a degree.',
    cta: 'Your chart with time and place', altLabel: 'Русский', privacy: 'Computed from the date only; nothing about you is stored.',
    hub: 'Other dates', app: 'Open in the app',
  };
  const prev = new Date(when.getTime() - 86400e3).toISOString().slice(0, 10), next = new Date(when.getTime() + 86400e3).toISOString().slice(0, 10);
  const links = [prev, next].filter((x) => +x.slice(0, 4) >= NEBO_YEARS[0] && +x.slice(0, 4) <= NEBO_YEARS[1]).map((x) => `<a href="${neboUrl(lang, x)}">${x}</a>`).join(' ');
  const dayPage = urlFor(lang, m, d);
  const inner = `
  <h1>${t.h1}</h1>
  <p class="lede">${t.lede}</p>
  <div class="chart">${svg}</div>
  <div class="facts">
    <h2>${t.factsH}</h2>
    <ul>${rows.join('')}<li>☽︎ ${t.moonL}</li></ul>
    <p class="note">${t.note}</p>
  </div>
  <section class="dossier"><h2>${lang === 'ru' ? 'Досье дня по реальным данным' : 'The day’s dossier, from real data'}</h2>
    <p class="note">${lang === 'ru' ? 'Не толкования — проверяемые факты. У каждого тег и источник.' : 'No interpretations — checkable facts, each with a tag and a source.'}</p>
    <ol>${dossier(when, new Date(), undefined, 70, { mode: 'date', lang }).map((x) => `<li><b>${x.title}</b> <span class="tag">[${lang === 'ru' ? x.tag : x.tag === 'ТОЧНО' ? 'EXACT' : 'ESTIMATE'}]</span><p>${x.text.replace(/(apod\.nasa\.gov\/\S+)/, '<a href="https://$1" rel="noopener">$1</a>')}</p><small>${x.source}</small></li>`).join('')}</ol>
  </section>
  <section><h2>${t.hub}</h2><div class="days">${links} <a href="${dayPage}">${lang === 'ru' ? 'все родившиеся' : 'everyone born'} ${lang === 'ru' ? `${d} ${MONTHS_RU[m - 1]}` : `${MONTHS_EN[m - 1]} ${d}`}</a></div></section>
  <a class="cta" href="/?birth=${iso}">${t.cta}</a>
  <p class="privacy">${t.privacy}</p>`;
  return shell(lang, { title: t.title, desc: t.desc, selfUrl, altUrl, altLabel: t.altLabel, inner });
}

// Sitemap: индекс по годам + по 365/366 URL на год (оба языка) — тоже по запросу.
export function neboSitemapIndex(): string {
  const items = [];
  for (let y = NEBO_YEARS[0]; y <= NEBO_YEARS[1]; y++) items.push(`<sitemap><loc>${SITE}/sitemap-nebo-${y}.xml</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join('')}</sitemapindex>`;
}
export function neboSitemapYear(y: number): string {
  const urls: string[] = [];
  for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86400e3) {
    const iso = new Date(t).toISOString().slice(0, 10);
    urls.push(`<url><loc>${SITE}${neboUrl('ru', iso)}</loc></url><url><loc>${SITE}${neboUrl('en', iso)}</loc></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}
