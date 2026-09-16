import { Body, Equator, HelioVector, Observer } from 'astronomy-engine';
import { sunSignAndConstellation } from '../compute/sign';

// Факты неба для календарной даты, не зависящие от года (дрейф < 1° за десятилетия):
// склонение и долгота Солнца, расстояние и скорость Земли, окно созвездия, активные метеорные потоки.
export interface DateFacts {
  sunLon: number;        // эклиптическая долгота Солнца, °
  dec: number;           // склонение Солнца, °
  distAu: number;        // расстояние Земля–Солнце, а.е.
  speedKms: number;      // орбитальная скорость Земли, км/с
  entered: Date;         // Солнце вошло в текущее созвездие (тот же опорный год)
  leaves: Date;          // Солнце выйдет из созвездия
  spanDays: number;
  showers: Shower[];
}
export interface Shower { ru: string; en: string; from: [number, number]; to: [number, number]; peak: [number, number]; zhr: number }

// IMO Working List (2024): крупные потоки с окном активности и ZHR в максимуме.
export const SHOWERS: Shower[] = [
  { ru: 'Квадрантиды', en: 'Quadrantids', from: [12, 28], to: [1, 12], peak: [1, 3], zhr: 80 },
  { ru: 'Лириды', en: 'Lyrids', from: [4, 14], to: [4, 30], peak: [4, 22], zhr: 18 },
  { ru: 'Эта-Аквариды', en: 'Eta Aquariids', from: [4, 19], to: [5, 28], peak: [5, 5], zhr: 50 },
  { ru: 'Южные дельта-Аквариды', en: 'Southern delta Aquariids', from: [7, 12], to: [8, 23], peak: [7, 30], zhr: 25 },
  { ru: 'Персеиды', en: 'Perseids', from: [7, 17], to: [8, 24], peak: [8, 12], zhr: 100 },
  { ru: 'Дракониды', en: 'Draconids', from: [10, 6], to: [10, 10], peak: [10, 8], zhr: 10 },
  { ru: 'Ориониды', en: 'Orionids', from: [10, 2], to: [11, 7], peak: [10, 21], zhr: 20 },
  { ru: 'Тауриды', en: 'Taurids', from: [9, 10], to: [11, 20], peak: [11, 5], zhr: 5 },
  { ru: 'Леониды', en: 'Leonids', from: [11, 6], to: [11, 30], peak: [11, 17], zhr: 15 },
  { ru: 'Геминиды', en: 'Geminids', from: [12, 4], to: [12, 17], peak: [12, 14], zhr: 150 },
  { ru: 'Урсиды', en: 'Ursids', from: [12, 17], to: [12, 26], peak: [12, 22], zhr: 10 },
];
const doy = (m: number, d: number): number => m * 40 + d; // порядок в году, високосность не важна
export function activeShowers(month: number, day: number): Shower[] {
  const x = doy(month, day);
  return SHOWERS.filter((s) => { const a = doy(...s.from), b = doy(...s.to); return a <= b ? x >= a && x <= b : x >= a || x <= b; });
}

const DAY = 86_400_000;
export function dateFacts(year: number, month: number, day: number): DateFacts {
  const when = new Date(Date.UTC(year, month - 1, day, 12));
  const { sunLon, constellationLatin } = sunSignAndConstellation(when);
  const dec = Equator(Body.Sun, when, new Observer(0, 0, 0), true, true).dec;
  const h0 = HelioVector(Body.Earth, when), h1 = HelioVector(Body.Earth, new Date(when.getTime() + 3_600_000));
  const distAu = Math.hypot(h0.x, h0.y, h0.z);
  const speedKms = Math.hypot(h1.x - h0.x, h1.y - h0.y, h1.z - h0.z) * 149_597_870.7 / 3600;
  const sameConst = (t: Date) => sunSignAndConstellation(t).constellationLatin === constellationLatin;
  let entered = when, leaves = when;
  while (sameConst(new Date(entered.getTime() - DAY))) entered = new Date(entered.getTime() - DAY);
  while (sameConst(new Date(leaves.getTime() + DAY))) leaves = new Date(leaves.getTime() + DAY);
  return { sunLon, dec, distAu, speedKms, entered, leaves, spanDays: Math.round((leaves.getTime() - entered.getTime()) / DAY) + 1, showers: activeShowers(month, day) };
}
