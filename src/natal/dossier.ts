// «Досье по реальным данным» (§2.1): вместо толкований — проверяемые факты о дне рождения.
// Каждый пункт: тег честности, текст, источник. Ничего не хранится, всё считается в браузере.
import { Body, GeoVector, Illumination, MoonPhase, SearchMoonPhase, Observer, Equator, Horizon } from 'astronomy-engine';
import { constellationVsSign } from '../compute/sign';
import { precessionOffsetDeg } from '../compute/precession';
import { contentValues } from '../registry/content';
import type { Place } from './natal';

export interface DossierItem { tag: 'ТОЧНО' | 'ОЦЕНКА'; title: string; text: string; source: string; }

const AU_KM = 149_597_870.7, DAY = 86_400_000, YEAR = 365.25 * DAY;
const fmt = (n: number, d = 0): string => n.toLocaleString('ru-RU', { maximumFractionDigits: d });
const ruDate = (d: Date): string => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
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
const phaseName = (deg: number): string => ['новолуние', 'растущий серп', 'первая четверть', 'растущая Луна', 'полнолуние', 'убывающая Луна', 'последняя четверть', 'убывающий серп'][Math.round(deg / 45) % 8];

export function dossier(when: Date, now: Date = new Date(), place?: Place, massKg = 70): DossierItem[] {
  const out: DossierItem[] = [];
  const ageY = (now.getTime() - when.getTime()) / YEAR, days = (now.getTime() - when.getTime()) / DAY;
  if (ageY <= 0) return out;

  // 1. Небо в момент рождения — только с временем и местом.
  if (place) {
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
  const ill = Illumination(Body.Moon, when).phase_fraction * 100, ph = MoonPhase(when);
  out.push({ tag: 'ТОЧНО', title: 'Луна в день рождения', source: 'astronomy-engine',
    text: `${phaseName(ph)}, освещена на ${ill.toFixed(0)} %; до Луны было ${fmt(dist(Body.Moon, when))} км.` });
  // 3. Созвездие vs знак.
  const cs = constellationVsSign(when);
  if (cs.text) out.push({ tag: 'ТОЧНО', title: 'Где было Солнце на самом деле', source: 'границы созвездий IAU 1930', text: cs.text.replace('Солнце сейчас', 'В день рождения Солнце') });
  // 4. Путь.
  out.push({ tag: 'ТОЧНО', title: 'Сколько ты уже пролетел', source: '29.78 км/с по орбите; 230 км/с вокруг центра Галактики',
    text: `${fmt(ageY, 1)} оборота вокруг Солнца — ${fmt(ageY * YEAR / 1000 * 29.78 / 1e6, 0)} млн км по орбите; ${fmt(days)} оборотов Земли; вместе с Солнцем — ${fmt(ageY * YEAR / 1000 * 230 / 1e9, 1)} млрд км вокруг центра Галактики.` });
  // 5. Тело — из контент-базы (сердце, распады, замена атомов).
  const cv = contentValues({ when: now, massKg, heightM: 1.7, ageYears: ageY });
  const pick = (id: string): string | null => { const v = cv.find((x) => x.id === id); return v && v.status === 'ok' ? `${v.label.toLowerCase()} — ${v.text ?? fmt(v.value ?? 0)}${v.unit ? ' ' + v.unit : ''}` : null; };
  const body = [pick('c.cell.heartbeats'), pick('c.nuc.decays_life'), pick('c.orb.moon_away')].filter(Boolean);
  if (body.length) out.push({ tag: 'ОЦЕНКА', title: 'Что накопилось с тех пор', source: 'контент-база COSMOS · не сверено', text: body.join('; ') + '.' });
  // 6. Планеты тогда и сейчас.
  const mThen = dist(Body.Mars, when) / 1e6, mNow = dist(Body.Mars, now) / 1e6;
  out.push({ tag: 'ТОЧНО', title: 'Марс тогда и сейчас', source: 'astronomy-engine; сверено с JPL Horizons на 2026-09-14',
    text: `В день рождения до Марса было ${fmt(mThen)} млн км, сейчас — ${fmt(mNow)} млн км (${mNow < mThen ? 'ближе' : 'дальше'} в ${fmt(Math.max(mThen, mNow) / Math.min(mThen, mNow), 1)} раза).` });
  // 7. Солнечный цикл.
  const sc = solarCycle(when);
  if (sc) out.push({ tag: 'ОЦЕНКА', title: 'Солнечный цикл', source: 'SILSO, сглаженные минимумы',
    text: `Ты родился в ${sc.n}-м солнечном цикле, ${sc.phase < 0.2 ? 'у самого минимума' : sc.phase < 0.45 ? 'на подъёме к максимуму' : sc.phase < 0.6 ? 'около максимума' : 'на спаде'} (${fmt(sc.phase * 100)} % цикла).` });
  // 8. Ближайшие возвраты.
  const marsRet = Math.ceil(days / 686.98) * 686.98, jupRet = Math.ceil(ageY / 11.862) * 11.862;
  let fullMoon: Date | null = null;
  for (let y = now.getUTCFullYear(); y < now.getUTCFullYear() + 40 && !fullMoon; y++) {
    const bd = new Date(Date.UTC(y, when.getUTCMonth(), when.getUTCDate()));
    if (bd.getTime() < now.getTime()) continue;
    const t = SearchMoonPhase(180, new Date(bd.getTime() - DAY / 2), 1);
    if (t) fullMoon = t.date;
  }
  out.push({ tag: 'ТОЧНО', title: 'Когда небо повторится', source: 'сидерические периоды: Марс 686.98 сут, Юпитер 11.862 г',
    text: `Марс вернётся в свою «родильную» точку орбиты ${ruDate(new Date(when.getTime() + marsRet * DAY))}; Юпитер — в ${when.getUTCFullYear() + Math.round(jupRet)} году${fullMoon ? `; полнолуние точно в твой день рождения — ${ruDate(fullMoon)}` : '.'}` });
  // 9. Прецессия за жизнь.
  const prec = precessionOffsetDeg(when), precNow = precessionOffsetDeg(now);
  out.push({ tag: 'ТОЧНО', title: 'Небо уехало за твою жизнь', source: 'прецессия 50.29″/год',
    text: `Точка весны сместилась на ${fmt(Math.abs(precNow - prec) * 3600)}″ с твоего рождения; от «знаков» астрологов реальные созвездия отстоят уже на ${fmt(prec, 1)}°.` });
  // 10. Что видели телескопы в этот день.
  if (when.getTime() >= Date.UTC(1995, 5, 16)) {
    const y = String(when.getUTCFullYear()).slice(2), m = String(when.getUTCMonth() + 1).padStart(2, '0'), d = String(when.getUTCDate()).padStart(2, '0');
    out.push({ tag: 'ТОЧНО', title: 'Снимок дня', source: 'NASA APOD', text: `Астрономическая картинка дня NASA за твою дату: apod.nasa.gov/apod/ap${y}${m}${d}.html` });
  }
  return out;
}
