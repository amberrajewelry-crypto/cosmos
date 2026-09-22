// Deep, per-date unique blocks for /natalnaya-karta/{MM-DD}/ (RU): decan + Egyptian term of the Sun
// (Ptolemy, Tetrabiblos I.20–21), fixed stars on the Sun's degree (I.9), day length in three cities,
// and internal links to dates sharing the same decan. Everything is computed — no filler.
import { Body, Observer, SearchRiseSet, MakeTime } from 'astronomy-engine';
import { toEcliptic, type StarCatalog } from '../data/stars';
import { sunSignAndConstellation } from '../compute/sign';
import { PLANETS } from './interp/planets';

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const PLANET_RU: Record<string, string> = Object.fromEntries(PLANETS.map((p) => [p.key, p.ru]));
const PLANET_GEN: Record<string, string> = { sun: 'Солнца', moon: 'Луны', mercury: 'Меркурия', venus: 'Венеры', mars: 'Марса', jupiter: 'Юпитера', saturn: 'Сатурна' };
const SIGN_GEN = ['Овна', 'Тельца', 'Близнецов', 'Рака', 'Льва', 'Девы', 'Весов', 'Скорпиона', 'Стрельца', 'Козерога', 'Водолея', 'Рыб'];

// Chaldean order of faces: Aries 0–10° starts with Mars, then descends the planetary spheres.
const CHALDEAN = ['mars', 'sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter'];
export const decanRuler = (sign: number, decan: number): string => CHALDEAN[(sign * 3 + decan) % 7];

// Egyptian terms (Tetrabiblos I.21): [ruler, upper bound in degrees] per sign.
const TERMS: Array<Array<[string, number]>> = [
  [['jupiter', 6], ['venus', 12], ['mercury', 20], ['mars', 25], ['saturn', 30]],
  [['venus', 8], ['mercury', 14], ['jupiter', 22], ['saturn', 27], ['mars', 30]],
  [['mercury', 6], ['jupiter', 12], ['venus', 17], ['mars', 24], ['saturn', 30]],
  [['mars', 7], ['venus', 13], ['mercury', 19], ['jupiter', 26], ['saturn', 30]],
  [['jupiter', 6], ['venus', 11], ['saturn', 18], ['mercury', 24], ['mars', 30]],
  [['mercury', 7], ['venus', 17], ['jupiter', 21], ['mars', 28], ['saturn', 30]],
  [['saturn', 6], ['mercury', 14], ['jupiter', 21], ['venus', 28], ['mars', 30]],
  [['mars', 7], ['venus', 11], ['mercury', 19], ['jupiter', 24], ['saturn', 30]],
  [['jupiter', 12], ['venus', 17], ['mercury', 21], ['saturn', 26], ['mars', 30]],
  [['mercury', 7], ['jupiter', 14], ['venus', 22], ['saturn', 26], ['mars', 30]],
  [['mercury', 7], ['venus', 13], ['jupiter', 20], ['mars', 25], ['saturn', 30]],
  [['venus', 12], ['jupiter', 16], ['mercury', 19], ['mars', 28], ['saturn', 30]],
];
export function termOf(sign: number, deg: number): { ruler: string; from: number; to: number } {
  let from = 0;
  for (const [ruler, to] of TERMS[sign]) { if (deg < to) return { ruler, from, to }; from = to; }
  return { ruler: TERMS[sign][4][0], from: TERMS[sign][3][1], to: 30 };
}

// How a sub-ruler colours the Sun — decan = outward style, term = the tool it works with.
const DECAN_TONE: Record<string, string> = {
  sun: 'Солнце в собственном лице: воля заметна сразу, человек хочет, чтобы его дело носило его имя.',
  moon: 'Лицо Луны: характер мягче знака, сильнее память, привязанности и чувство дома; настроение меняет решения.',
  mercury: 'Лицо Меркурия: ум быстрее чувств — слова, учёба, сделки, умение объяснить то, что знак только чувствует.',
  venus: 'Лицо Венеры: знак проявляется через вкус, отношения и красоту; конфликтов избегают, договариваются.',
  mars: 'Лицо Марса: знак звучит резче — действие раньше раздумья, смелость, спор, телесная энергия.',
  jupiter: 'Лицо Юпитера: щедрость, вера в лучшее, тяга к учителям и широким задачам; удача через людей.',
  saturn: 'Лицо Сатурна: серьёзность не по годам, выдержка, долгие проекты; успех приходит поздно, но прочно.',
};
const TERM_TOOL: Record<string, string> = {
  mercury: 'работает словом, расчётом и связями',
  venus: 'работает обаянием, вкусом и умением договориться',
  mars: 'работает напором, скоростью и готовностью рискнуть',
  jupiter: 'работает доверием, покровительством и широтой взгляда',
  saturn: 'работает терпением, порядком и умением ждать',
};
const ADVICE: Record<string, string> = {
  sun: 'не прятать авторство — подписывать свою работу',
  moon: 'беречь режим сна и дом: из них берётся сила',
  mercury: 'записывать мысли и доводить разговоры до договорённостей',
  venus: 'не платить миром за правду — красиво можно и не соглашаться',
  mars: 'сначала цель, потом удар: гнев без цели сжигает силы',
  jupiter: 'не обещать больше, чем можно выполнить за год',
  saturn: 'выбрать одно дело на годы и не бросать на спаде',
};

// Ptolemy, Tetrabiblos I.9: planetary "temperament" of bright stars.
const STAR_NATURE: Record<string, string> = {
  'Альдебаран': 'Марса', 'Регул': 'Марса и Юпитера', 'Спика': 'Венеры и немного Марса', 'Антарес': 'Марса и немного Юпитера',
  'Фомальгаут': 'Венеры и Меркурия', 'Поллукс': 'Марса', 'Кастор': 'Меркурия', 'Сириус': 'Юпитера и немного Марса',
  'Арктур': 'Юпитера и Марса', 'Вега': 'Венеры и Меркурия', 'Капелла': 'Марса и Меркурия', 'Процион': 'Меркурия и немного Марса',
  'Алголь': 'Сатурна и Юпитера', 'Альтаир': 'Марса и Юпитера', 'Бетельгейзе': 'Марса и Меркурия', 'Ригель': 'Юпитера и Сатурна',
  'Канопус': 'Сатурна и Юпитера', 'Ахернар': 'Юпитера', 'Альциона': 'Луны и Марса', 'Денебола': 'Сатурна и Венеры',
  'Хамаль': 'Марса и Сатурна', 'Маркаб': 'Марса и Меркурия', 'Шеат': 'Марса и Меркурия',
};

const CITIES: Array<[string, number, number, number]> = [
  ['Москве', 55.7558, 37.6173, 3], ['Санкт-Петербурге', 59.9343, 30.3351, 3], ['Новосибирске', 55.0084, 82.9357, 7],
];

const norm = (x: number) => ((x % 360) + 360) % 360;
const hm = (min: number) => `${Math.floor(min / 60)} ч ${String(Math.round(min % 60)).padStart(2, '0')} мин`;

// Sun longitude per day of the reference year, computed once for all 366 pages.
let lonCache: { year: number; days: Array<{ m: number; d: number; lon: number }> } | null = null;
function yearLons(year: number) {
  if (lonCache?.year === year) return lonCache.days;
  const days: Array<{ m: number; d: number; lon: number }> = [];
  for (let t = Date.UTC(year, 0, 1, 12); new Date(t).getUTCFullYear() === year; t += 864e5) {
    const dt = new Date(t);
    days.push({ m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), lon: sunSignAndConstellation(dt).sunLon });
  }
  lonCache = { year, days };
  return days;
}

function dayLength(year: number, month: number, day: number, lat: number, lon: number, tz: number) {
  const obs = new Observer(lat, lon, 0);
  const start = MakeTime(new Date(Date.UTC(year, month - 1, day, -tz)));
  const rise = SearchRiseSet(Body.Sun, obs, +1, start, 1);
  const set = SearchRiseSet(Body.Sun, obs, -1, start, 1);
  if (!rise || !set) return null;
  const local = (d: Date) => { const m = (d.getUTCHours() + tz) * 60 + d.getUTCMinutes(); const x = ((m % 1440) + 1440) % 1440; return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
  const len = (set.date.getTime() - rise.date.getTime()) / 6e4;
  return { rise: local(rise.date), set: local(set.date), len: len > 0 ? len : len + 1440 };
}

export function dateDeepHtml(year: number, month: number, day: number, cat: StarCatalog | null,
  urlFor: (m: number, d: number) => string): string {
  const when = new Date(Date.UTC(year, month - 1, day, 12));
  const lon = sunSignAndConstellation(when).sunLon;
  const sign = Math.floor(norm(lon) / 30), deg = norm(lon) - sign * 30, decan = Math.floor(deg / 10);
  const dr = decanRuler(sign, decan), term = termOf(sign, deg);
  const dateStr = `${day} ${MONTHS_GEN[month - 1]}`;

  // Dates with the Sun in the same decan -> internal links.
  const same = yearLons(year).filter((x) => Math.floor(norm(x.lon) / 10) === sign * 3 + decan);
  // Capricorn I spans New Year: put December days before January ones.
  if (same.some((x) => x.m === 1) && same.some((x) => x.m === 12)) same.sort((x, y) => (y.m === 12 ? 1 : 0) - (x.m === 12 ? 1 : 0));
  const range = same.length ? `${same[0].d} ${MONTHS_GEN[same[0].m - 1]} — ${same[same.length - 1].d} ${MONTHS_GEN[same[same.length - 1].m - 1]}` : '';
  const links = same.filter((x) => !(x.m === month && x.d === day))
    .map((x) => `<a href="${urlFor(x.m, x.d)}">${x.d} ${MONTHS_GEN[x.m - 1]}</a>`).join('');

  const decanHtml = `<div class="facts razbor"><h2>${decan + 1}-й декан ${SIGN_GEN[sign]}: лицо ${PLANET_GEN[dr]}</h2>
    <p><span class="tag">[ТОЧНО]</span> ${dateStr} Солнце стоит на <b>${deg.toFixed(1)}°</b> тропического знака ${SIGN_GEN[sign]} — это ${decan + 1}-я из трёх десятиградусных частей знака (декан, «лицо»). Солнце проходит этот декан ${range ? `в период ${range}` : 'около десяти дней'}.</p>
    <p><span class="tag">[ТРАДИЦИЯ]</span> По халдейскому порядку этим деканом управляет <b>${PLANET_RU[dr]}</b>. ${DECAN_TONE[dr]}</p>
    <p>Внутри декана градус ${Math.floor(deg)}° попадает в египетский <b>терм ${PLANET_GEN[term.ruler]}</b> (${term.from}–${term.to}°): солнечная воля ${TERM_TOOL[term.ruler]}. Птолемей считал термы самым тонким слоем достоинств — они различают людей одного знака.</p>
    <p><b>Наставление.</b> Для рождённых ${dateStr}: ${ADVICE[dr]}; и ${ADVICE[term.ruler]}.</p>
    <p class="note">Источник: Птолемей «Тетрабиблос» I.20–21 (термы по египетской системе), халдейский порядок лиц. Градус — полдень UTC; у рождённых на границе декана или терма точный градус зависит от года и часа.</p>
  </div>`;

  // Bright named stars on the Sun's ecliptic degree (±1.5° in longitude).
  let starsHtml = '';
  if (cat) {
    const bright = cat.stars.filter((s) => s[5] && /[А-я]/.test(s[5]) && s[3] < 2.6).map((s) => {
      const [slon, slat] = toEcliptic(s[1], s[2], year);
      const d = ((norm(slon - lon) + 180) % 360) - 180;
      return { name: s[5], V: s[3], ly: s[4] > 0 ? 3261.56 / s[4] : 0, lat: slat, d };
    });
    const near = bright.filter((s) => Math.abs(s.d) <= 1.5).sort((a, b) => a.V - b.V);
    const nearest = [...bright].sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
    const star = (s: typeof nearest) => `<b>${s.name}</b> (блеск ${s.V.toFixed(2)}<sup>m</sup>${s.ly ? `, ${Math.round(s.ly)} св. лет` : ''}, ${Math.abs(s.lat).toFixed(0)}° ${s.lat >= 0 ? 'севернее' : 'южнее'} эклиптики)${STAR_NATURE[s.name] ? ` — по Птолемею звезда природы ${STAR_NATURE[s.name]}` : ''}`;
    starsHtml = `<div class="facts"><h2>Неподвижные звёзды на градусе Солнца</h2>
    <p><span class="tag">[ТОЧНО]</span> ${near.length
      ? `${dateStr} Солнце проходит тот же градус эклиптики, что и ${near.map(star).join('; ')}.`
      : `${dateStr} ярких звёзд на градусе Солнца нет. Ближайшая по долготе — ${star(nearest)}, в ${Math.abs(nearest.d).toFixed(1)}° ${nearest.d > 0 ? 'впереди' : 'позади'} Солнца.`}</p>
    <p><span class="tag">[ТРАДИЦИЯ]</span> Соединение Солнца с яркой звездой традиция читала как «печать» судьбы: звезда добавляет к знаку характер своих планет — ярче, но и резче. <span class="tag">[НАУКА]</span> Звезда в сотнях световых лет не действует на человека; зато это честная астрономия: в день рождения Солнце закрывает её от нас, и увидеть её можно только через полгода.</p>
    <p class="note">Каталог: HIPPARCOS (блеск ≤ 2.6<sup>m</sup>), координаты с учётом прецессии на ${year} г., орбис ±1.5° по долготе.</p></div>`;
  }

  const dl = CITIES.map(([city, la, lo, tz]) => ({ city, v: dayLength(year, month, day, la, lo, tz) }));
  const dayHtml = `<div class="facts"><h2>Свет дня рождения: ${dateStr}</h2>
    <p><span class="tag">[ТОЧНО]</span> ${dl.map(({ city, v }) => v ? `В ${city} Солнце встаёт в ${v.rise} и садится в ${v.set} — день длится <b>${hm(v.len)}</b>.` : `В ${city} в этот день Солнце не заходит или не восходит.`).join(' ')}</p>
    <p><span class="tag">[НАУКА]</span> Это единственный «эффект даты рождения», который подтверждён: сезон определяет свет и витамин D в первые месяцы жизни, и в больших когортах он слабо, но измеримо связан со здоровьем и ростом. Не с характером — со светом.</p>
    <p class="note">Восход и закат — верхний край диска с рефракцией (astronomy-engine), местное время без летнего.</p></div>`;

  const linksHtml = links ? `<section><h2>Тот же декан: ${range}</h2><div class="days">${links}</div></section>` : '';
  return decanHtml + starsHtml + dayHtml + linksHtml;
}
