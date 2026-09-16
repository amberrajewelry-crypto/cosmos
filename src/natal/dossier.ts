// «Досье по реальным данным» (§2.1): вместо толкований — проверяемые факты о дне рождения.
// Каждый пункт: тег честности, текст, источник. Ничего не хранится, всё считается в браузере.
import { Body, GeoVector, Illumination, MoonPhase, SearchMoonPhase, Observer, Equator, Horizon } from 'astronomy-engine';
import { constellationVsSign } from '../compute/sign';
import { precessionOffsetDeg } from '../compute/precession';
import { contentValues } from '../registry/content';
import type { Place } from './natal';

export interface DossierItem { tag: 'ТОЧНО' | 'ОЦЕНКА'; title: string; text: string; source: string; }
// mode 'birth' — обращение «ты родился»; 'date' — про день без человека (SEO-страницы /nebo/, оба языка).
export interface DossierOpts { mode?: 'birth' | 'date'; lang?: 'ru' | 'en'; }

const AU_KM = 149_597_870.7, DAY = 86_400_000, YEAR = 365.25 * DAY;
const fmt = (n: number, d = 0): string => n.toLocaleString('ru-RU', { maximumFractionDigits: d });
const ruDate = (d: Date, lang: 'ru' | 'en' = 'ru'): string => d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dist = (b: Body, when: Date): number => GeoVector(b, when, true).Length() * AU_KM;

// Солнечные циклы по SILSO (минимумы, сглаженные): номер и фаза цикла на дату.
const CYCLE_MIN: Array<[number, string]> = [
  [19, '1954-04'], [20, '1964-10'], [21, '1976-03'], [22, '1986-09'], [23, '1996-08'], [24, '2008-12'], [25, '2019-12'], [26, '2030-06'],
];
export function solarCycle(when: Date): { n: number; phase: number } | null {
  for (let i = CYCLE_MIN.length - 1; i >= 0; i--) {
    const t0 = new Date(CYCLE_MIN[i][1] + '-01T00:00:00Z').getTime();
    if (when.getTime() >= t0) {
      const t1 = i + 1 < CYCLE_MIN.length ? new Date(CYCLE_MIN[i + 1][1] + '-01T00:00:00Z').getTime() : t0 + 11 * YEAR;
      return { n: CYCLE_MIN[i][0], phase: (when.getTime() - t0) / (t1 - t0) };
    }
  }
  return null;
}
const PHASES = { ru: ['новолуние', 'растущий серп', 'первая четверть', 'растущая Луна', 'полнолуние', 'убывающая Луна', 'последняя четверть', 'убывающий серп'],
  en: ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'] };
const phaseName = (deg: number, lang: 'ru' | 'en' = 'ru'): string => PHASES[lang][Math.round(deg / 45) % 8];
const enNum = (n: number, d = 0): string => n.toLocaleString('en-US', { maximumFractionDigits: d });

export function dossier(when: Date, now: Date = new Date(), place?: Place, massKg = 70, opts: DossierOpts = {}): DossierItem[] {
  const mode = opts.mode ?? 'birth', lang = opts.lang ?? 'ru', ru = lang === 'ru', birth = mode === 'birth';
  const N = ru ? fmt : enNum, D = (d: Date): string => ruDate(d, lang);
  const out: DossierItem[] = [];
  const ageY = (now.getTime() - when.getTime()) / YEAR, days = (now.getTime() - when.getTime()) / DAY;
  if (ageY <= 0) return out;
  const since = ru ? (birth ? 'с твоего рождения' : 'с этого дня') : (birth ? 'since you were born' : 'since that day');
  const then = ru ? (birth ? 'В день рождения' : 'В этот день') : (birth ? 'On your birthday' : 'On that day');

  // 1. Небо в момент рождения — только с временем и местом.
  if (place && birth) {
    const obs = new Observer(place.lat, place.lon, 0);
    const up: string[] = [];
    for (const [b, n] of [[Body.Sun, 'Солнце'], [Body.Moon, 'Луна'], [Body.Mercury, 'Меркурий'], [Body.Venus, 'Венера'], [Body.Mars, 'Марс'], [Body.Jupiter, 'Юпитер'], [Body.Saturn, 'Сатурн']] as Array<[Body, string]>) {
      const eq = Equator(b, when, obs, true, true), h = Horizon(when, obs, eq.ra, eq.dec, 'normal');
      if (h.altitude > 0) up.push(`${n} ${h.altitude.toFixed(0)}°`);
    }
    out.push({ tag: 'ТОЧНО', title: 'Небо над родильным домом', source: 'astronomy-engine (VSOP87/ELP)',
      text: up.length ? `Над горизонтом были: ${up.join(', ')} (высота над горизонтом).` : 'Все яркие тела были под горизонтом — глубокая ночь без Луны.' });
  }
  // 2. Луна.
  const ill = Illumination(Body.Moon, when).phase_fraction * 100, ph = MoonPhase(when), md = N(dist(Body.Moon, when));
  out.push({ tag: 'ТОЧНО', title: ru ? (birth ? 'Луна в день рождения' : 'Луна в этот день') : (birth ? 'The Moon on your birthday' : 'The Moon that day'), source: 'astronomy-engine',
    text: ru ? `${phaseName(ph)}, освещена на ${ill.toFixed(0)} %; до Луны было ${md} км.` : `${phaseName(ph, 'en')}, ${ill.toFixed(0)}% lit; the Moon was ${md} km away.` });
  // 3. Созвездие vs знак (на /nebo/ уже есть в шапке — только в режиме рождения).
  const cs = constellationVsSign(when);
  if (cs.text && birth && ru) out.push({ tag: 'ТОЧНО', title: 'Где было Солнце на самом деле', source: 'границы созвездий IAU 1930', text: cs.text.replace('Солнце сейчас', 'В день рождения Солнце') });
  // 4. Путь.
  const orbit = N(ageY * YEAR / 1000 * 29.78 / 1e6), gal = N(ageY * YEAR / 1000 * 230 / 1e9, 1);
  out.push({ tag: 'ТОЧНО', title: ru ? (birth ? 'Сколько ты уже пролетел' : 'Сколько Земля пролетела с тех пор') : (birth ? 'How far you have travelled' : 'How far Earth has travelled since'),
    source: ru ? '29.78 км/с по орбите; 230 км/с вокруг центра Галактики' : '29.78 km/s along the orbit; 230 km/s around the Galactic centre',
    text: ru ? `${N(ageY, 1)} оборота вокруг Солнца — ${orbit} млн км по орбите; ${N(days)} оборотов Земли; вместе с Солнцем — ${gal} млрд км вокруг центра Галактики.`
      : `${N(ageY, 1)} orbits of the Sun — ${orbit} million km; ${N(days)} rotations of Earth; with the Sun — ${gal} billion km around the Galactic centre.` });
  // 5. Тело — из контент-базы (только режим рождения).
  if (birth && ru) {
    const cv = contentValues({ when: now, massKg, heightM: 1.7, ageYears: ageY });
    const pick = (id: string): string | null => { const v = cv.find((x) => x.id === id); return v && v.status === 'ok' ? `${v.label.toLowerCase()} — ${v.text ?? fmt(v.value ?? 0)}${v.unit ? ' ' + v.unit : ''}` : null; };
    const body = [pick('c.cell.heartbeats'), pick('c.nuc.decays_life'), pick('c.orb.moon_away')].filter(Boolean);
    if (body.length) out.push({ tag: 'ОЦЕНКА', title: 'Что накопилось с тех пор', source: 'контент-база COSMOS · не сверено', text: body.join('; ') + '.' });
  }
  // 6. Марс тогда и сейчас.
  const mThen = dist(Body.Mars, when) / 1e6, mNow = dist(Body.Mars, now) / 1e6, ratio = N(Math.max(mThen, mNow) / Math.min(mThen, mNow), 1);
  out.push({ tag: 'ТОЧНО', title: ru ? 'Марс тогда и сейчас' : 'Mars then and now', source: ru ? 'astronomy-engine; сверено с JPL Horizons на 2026-09-14' : 'astronomy-engine; checked against JPL Horizons for 2026-09-14',
    text: ru ? `${then} до Марса было ${N(mThen)} млн км, сейчас — ${N(mNow)} млн км (${mNow < mThen ? 'ближе' : 'дальше'} в ${ratio} раза).`
      : `${then} Mars was ${N(mThen)} million km away; today it is ${N(mNow)} million km (${mNow < mThen ? 'closer' : 'farther'} by ${ratio}×).` });
  // 7. Солнечный цикл.
  const sc = solarCycle(when);
  if (sc) {
    const phRu = sc.phase < 0.2 ? 'у самого минимума' : sc.phase < 0.45 ? 'на подъёме к максимуму' : sc.phase < 0.6 ? 'около максимума' : 'на спаде';
    const phEn = sc.phase < 0.2 ? 'right at the minimum' : sc.phase < 0.45 ? 'on the rise to maximum' : sc.phase < 0.6 ? 'near maximum' : 'on the decline';
    out.push({ tag: 'ОЦЕНКА', title: ru ? 'Солнечный цикл' : 'Solar cycle', source: ru ? 'SILSO, сглаженные минимумы' : 'SILSO smoothed minima',
      text: ru ? `${birth ? 'Ты родился' : 'Этот день пришёлся'} в ${sc.n}-м солнечном цикле, ${phRu} (${N(sc.phase * 100)} % цикла).`
        : `${birth ? 'You were born' : 'That day fell'} in solar cycle ${sc.n}, ${phEn} (${N(sc.phase * 100)}% through the cycle).` });
  }
  // 8. Ближайшие возвраты.
  const marsRet = Math.ceil(days / 686.98) * 686.98, jupRet = Math.ceil(ageY / 11.862) * 11.862;
  let fullMoon: Date | null = null;
  for (let y = now.getUTCFullYear(); y < now.getUTCFullYear() + 40 && !fullMoon; y++) {
    const bd = new Date(Date.UTC(y, when.getUTCMonth(), when.getUTCDate()));
    if (bd.getTime() < now.getTime()) continue;
    const t = SearchMoonPhase(180, new Date(bd.getTime() - DAY / 2), 1);
    if (t) fullMoon = t.date;
  }
  const marsDate = D(new Date(when.getTime() + marsRet * DAY)), jupYear = when.getUTCFullYear() + Math.round(jupRet);
  out.push({ tag: 'ТОЧНО', title: ru ? 'Когда небо повторится' : 'When the sky repeats', source: ru ? 'сидерические периоды: Марс 686.98 сут, Юпитер 11.862 г' : 'sidereal periods: Mars 686.98 d, Jupiter 11.862 yr',
    text: ru ? `Марс вернётся в ${birth ? 'свою «родильную» точку орбиты' : 'точку орбиты этого дня'} ${marsDate}; Юпитер — в ${jupYear} году${fullMoon ? `; полнолуние точно в ${birth ? 'твой день рождения' : 'эту дату'} — ${D(fullMoon)}` : '.'}`
      : `Mars returns to ${birth ? 'its birthday point of the orbit' : 'that day’s point of its orbit'} on ${marsDate}; Jupiter — in ${jupYear}${fullMoon ? `; a full moon exactly on ${birth ? 'your birthday' : 'this date'} — ${D(fullMoon)}` : '.'}` });
  // 9. Прецессия.
  const prec = precessionOffsetDeg(when), precNow = precessionOffsetDeg(now), shift = N(Math.abs(precNow - prec) * 3600);
  out.push({ tag: 'ТОЧНО', title: ru ? (birth ? 'Небо уехало за твою жизнь' : 'Небо уехало с тех пор') : (birth ? 'How far the sky has drifted in your lifetime' : 'How far the sky has drifted since'), source: ru ? 'прецессия 50.29″/год' : 'precession 50.29″/yr',
    text: ru ? `Точка весны сместилась на ${shift}″ ${since}; от «знаков» астрологов реальные созвездия отстоят уже на ${N(prec, 1)}°.`
      : `The vernal point has shifted ${shift}″ ${since}; the real constellations now sit ${N(prec, 1)}° away from the astrologers’ “signs”.` });
  // 10. APOD.
  if (when.getTime() >= Date.UTC(1995, 5, 16)) {
    const y = String(when.getUTCFullYear()).slice(2), m = String(when.getUTCMonth() + 1).padStart(2, '0'), d = String(when.getUTCDate()).padStart(2, '0');
    out.push({ tag: 'ТОЧНО', title: ru ? 'Снимок дня' : 'Picture of the day', source: 'NASA APOD', text: ru ? `Астрономическая картинка дня NASA за ${birth ? 'твою дату' : 'эту дату'}: apod.nasa.gov/apod/ap${y}${m}${d}.html` : `NASA Astronomy Picture of the Day for this date: apod.nasa.gov/apod/ap${y}${m}${d}.html` });
  }
  return out;
}
