// Сверка по прошлому: человек отмечает годы, когда было явно хорошо или плохо, — проверяем, какой набор
// полезных/вредных (用/喜/忌) лучше объясняет его жизнь, и при неизвестном часе — какой час рождения.
// Классика проверяет вывод по прожитым тактам на словах; здесь это сделано числом (практика проекта, не цитата).
// Правило честности: чем больше гипотез, тем легче случайное совпадение, поэтому
// натальный вывод меняем только при явном перевесе и ≥5 событиях.
import { EL, type El } from './core';
import { computeChart, analyze, yearIdx, DEFAULT_VARIANT, type BirthInput, type Chart, type Analysis } from './calc';
import { periodVerdict, type Brain } from './brain';
import { dayInfo } from './days';

export type Sphere = 'money' | 'work' | 'love' | 'health' | 'move' | 'family' | 'other';
export const SPHERE_RU: Record<Sphere, string> = { money: 'деньги', work: 'работа', love: 'любовь', health: 'здоровье', move: 'переезд', family: 'семья', other: 'другое' };
export interface LifeEvent { year: number; good: boolean; sphere?: Sphere; note?: string }
export interface DayMark { iso: string; good: boolean }
/** hits/miss — годы; dHits/dMiss — дни журнала (день весит 1/3 года: оценка дня шумнее). */
export interface Hypo { id: string; label: string; yong: El; xi: El[]; ji: El[]; hits: number; miss: number; dHits: number; dMiss: number; net: number }
export interface Calib {
  n: number; base: Hypo; best: Hypo; hypos: Hypo[]; chance: number;
  verdict: 'confirmed' | 'changed' | 'unclear' | 'few'; text: string;
}

const TONE = { good: 1, bad: -1, mixed: 0, calm: 0 } as const;
const uniq = (xs: El[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/** Событие года Y: год весит 1, такт (фон) — 0.5. */
function eventScore(b: Brain, c: Chart, Y: number): number {
  const yi = yearIdx(Y), lk = [...c.luck].reverse().find((l) => l.year <= Y);
  const y = TONE[periodVerdict(b, yi, c, lk?.idx).tone];
  const l = lk ? TONE[periodVerdict(b, lk.idx, c, yi).tone] : 0;
  return y + 0.5 * l;
}

export const DAY_W = 1 / 3;
/** Разбор с другим набором полезных/вредных — для пересчёта дней. */
const withSet = (a: Analysis, b: Brain): Analysis => (b === a.brain ? a : { ...a, brain: b, consensus: [b.yong, ...b.xi], avoid: b.ji });

function score(b: Brain, c: Chart, a: Analysis, evs: LifeEvent[], days: DayMark[], id: string, label: string): Hypo {
  let hits = 0, miss = 0, dHits = 0, dMiss = 0;
  for (const e of evs) {
    const s = eventScore(b, c, e.year) * (e.good ? 1 : -1);
    if (s > 0) hits++; else if (s < 0) miss++;
  }
  if (days.length) {
    const A = withSet(a, b);
    for (const d of days) {
      const [y, m, dd] = d.iso.split('-').map(Number), s = dayInfo(c, A, y, m, dd).score * (d.good ? 1 : -1);
      if (s > 0) dHits++; else if (s < 0) dMiss++;
    }
  }
  return { id, label, yong: b.yong, xi: b.xi, ji: b.ji, hits, miss, dHits, dMiss, net: hits - miss + DAY_W * (dHits - dMiss) };
}

/** Набор «полезна стихия E»: 喜 — то, что её рождает; 忌 — то, что её бьёт, и то, что она сама бьёт (её истощает). */
const setFor = (E: El, b: Brain): Brain => {
  const xi = [((E + 4) % 5) as El], ji = uniq([((E + 3) % 5) as El, ((E + 2) % 5) as El]).filter((x) => !xi.includes(x));
  return { ...b, yong: E, xi, ji, alt: undefined };
};

/** P(≥k совпадений из m) при монетке — насколько результат может быть случайным. */
function tail(k: number, m: number): number {
  let p = 0, comb = 1;
  for (let i = 0; i <= m; i++) { if (i >= k) p += comb; comb = (comb * (m - i)) / (i + 1); }
  return p / 2 ** m;
}

export function calibrate(c: Chart, a: Analysis, evs: LifeEvent[], days: DayMark[] = []): Calib {
  const b = a.brain;
  const base = score(b, c, a, evs, days, 'base', `как в разборе: ${EL[b.yong]}`);
  const hypos = [base];
  if (b.alt) hypos.push(score({ ...b, ...b.alt, alt: undefined }, c, a, evs, days, 'alt', `противоположный перевес: ${EL[b.alt.yong]}`));
  for (let e = 0; e < 5; e++) if (e !== b.yong) hypos.push(score(setFor(e as El, b), c, a, evs, days, `el${e}`, `главная — ${EL[e]}`));
  hypos.sort((x, y) => y.net - x.net || (x.id === 'base' ? -1 : y.id === 'base' ? 1 : 0));
  const best = hypos[0], ny = evs.length, nd = days.length, n = ny + DAY_W * nd;
  const w = (h: Hypo) => h.hits + DAY_W * h.dHits, decided = base.hits + base.miss + DAY_W * (base.dHits + base.dMiss);
  const chance = decided ? tail(Math.round(w(base)), Math.round(decided)) : 1;
  let verdict: Calib['verdict'], text: string;
  const rate = (h: Hypo) => [ny ? `${h.hits} из ${ny} лет` : '', nd ? `${h.dHits} из ${nd} дней` : ''].filter(Boolean).join(' и ');
  if (n < 5) { verdict = 'few'; text = `Данных мало (годов ${ny}, отмеченных дней ${nd}). Нужно хотя бы 5 лет, когда было явно хорошо или плохо, — или около 15 отмеченных дней на каждый недостающий год.`; }
  else if (best.id !== 'base' && best.net - base.net >= 2 && w(best) / n >= 0.7) {
    verdict = 'changed';
    text = `Ваши годы лучше объясняет другой расклад (${best.label}): совпало ${rate(best)}, а у разбора по формуле — ${rate(base)}. Мы проверяли ${hypos.length} вариантов, поэтому это повод пересмотреть, а не доказательство.`;
  } else if (w(base) / n >= 0.6 && base.net >= best.net - 1) {
    verdict = 'confirmed';
    text = `Разбор подтверждается вашей жизнью: совпало ${rate(base)}${chance < 0.2 ? '' : ' — но при таком числе событий это могло выйти и случайно'}.`;
  } else {
    verdict = 'unclear';
    text = `Ясного ответа нет: у разбора совпало ${rate(base)}, у лучшего варианта (${best.label}) — ${rate(best)}. Добавьте ещё событий или проверьте время рождения.`;
  }
  return { n, base, best, hypos, chance, verdict, text };
}

/** Применить найденный набор к разбору — дальше такты, годы и дни считаются по нему. */
export function applyHypo(a: Analysis, h: Pick<Hypo, 'yong' | 'xi' | 'ji' | 'label'>): void {
  const b = a.brain;
  b.yong = h.yong; b.xi = h.xi; b.ji = h.ji; b.alt = undefined;
  b.steps.push({ title: 'Сверка по вашей жизни', src: 'сверка по событиям пользователя (calibrate.ts)',
    text: `Полезная стихия выбрана по вашим событиям прошлых лет (${h.label}), а не только по формуле.` });
  a.consensus = [b.yong, ...b.xi];
  a.avoid = b.ji;
}

/** Время неизвестно или сомнительно: какой из 12 двухчасовых отрезков лучше объясняет события. */
export function rankHours(input: BirthInput, evs: LifeEvent[]): { hour: number; time: string; hits: number; miss: number; yong: El }[] {
  const out = [];
  for (let k = 0; k < 12; k++) {
    const time = `${String((2 * k) % 24).padStart(2, '0')}:00`;
    const c = computeChart({ ...input, time, timeKnown: true }, { ...DEFAULT_VARIANT, solar: false });
    const a = analyze(c), h = score(a.brain, c, a, evs, [], 'h', '');
    out.push({ hour: k, time, hits: h.hits, miss: h.miss, yong: a.brain.yong });
  }
  return out.sort((x, y) => (y.hits - y.miss) - (x.hits - x.miss));
}

/** Набор в адрес (для заставки): «用喜…-忌…» цифрами стихий, напр. 41-23. */
export const encodeSet = (h: Pick<Hypo, 'yong' | 'xi' | 'ji'>) => `${h.yong}${h.xi.join('')}-${h.ji.join('')}`;
export function decodeSet(s: string | undefined | null): Pick<Hypo, 'yong' | 'xi' | 'ji' | 'label'> | null {
  const m = /^([0-4])([0-4]{0,2})-([0-4]{0,2})$/.exec(s ?? '');
  if (!m) return null;
  const yong = +m[1] as El;
  return { yong, xi: [...m[2]].map(Number) as El[], ji: [...m[3]].map(Number) as El[], label: `главная — ${EL[yong]}` };
}
