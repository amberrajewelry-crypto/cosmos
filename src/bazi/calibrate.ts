// Сверка по прошлому: человек отмечает годы, когда было явно хорошо или плохо, — проверяем, какой набор
// полезных/вредных (用/喜/忌) лучше объясняет его жизнь, и при неизвестном часе — какой час рождения.
// Классика проверяет вывод по прожитым тактам на словах; здесь это сделано числом (практика проекта, не цитата).
// Правило честности: чем больше гипотез, тем легче случайное совпадение, поэтому
// натальный вывод меняем только при явном перевесе и ≥5 событиях.
import { EL, type El } from './core';
import { computeChart, analyze, yearIdx, DEFAULT_VARIANT, type BirthInput, type Chart, type Analysis } from './calc';
import { periodVerdict, type Brain } from './brain';

export type Sphere = 'money' | 'work' | 'love' | 'health' | 'move' | 'family' | 'other';
export const SPHERE_RU: Record<Sphere, string> = { money: 'деньги', work: 'работа', love: 'любовь', health: 'здоровье', move: 'переезд', family: 'семья', other: 'другое' };
export interface LifeEvent { year: number; good: boolean; sphere?: Sphere; note?: string }
export interface Hypo { id: string; label: string; yong: El; xi: El[]; ji: El[]; hits: number; miss: number; net: number }
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

function score(b: Brain, c: Chart, evs: LifeEvent[], id: string, label: string): Hypo {
  let hits = 0, miss = 0;
  for (const e of evs) {
    const s = eventScore(b, c, e.year) * (e.good ? 1 : -1);
    if (s > 0) hits++; else if (s < 0) miss++;
  }
  return { id, label, yong: b.yong, xi: b.xi, ji: b.ji, hits, miss, net: hits - miss };
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

export function calibrate(c: Chart, a: Analysis, evs: LifeEvent[]): Calib {
  const b = a.brain;
  const base = score(b, c, evs, 'base', `как в разборе: ${EL[b.yong]}`);
  const hypos = [base];
  if (b.alt) hypos.push(score({ ...b, ...b.alt, alt: undefined }, c, evs, 'alt', `противоположный перевес: ${EL[b.alt.yong]}`));
  for (let e = 0; e < 5; e++) if (e !== b.yong) hypos.push(score(setFor(e as El, b), c, evs, `el${e}`, `главная — ${EL[e]}`));
  hypos.sort((x, y) => y.net - x.net || (x.id === 'base' ? -1 : y.id === 'base' ? 1 : 0));
  const best = hypos[0], n = evs.length, decided = base.hits + base.miss;
  const chance = decided ? tail(base.hits, decided) : 1;
  let verdict: Calib['verdict'], text: string;
  const rate = (h: Hypo) => `${h.hits} из ${n}`;
  if (n < 5) { verdict = 'few'; text = `Событий ${n} — мало. Нужно хотя бы 5 (лучше 7–10) годов, когда было явно хорошо или явно плохо.`; }
  else if (best.id !== 'base' && best.net - base.net >= 2 && best.hits / n >= 0.7) {
    verdict = 'changed';
    text = `Ваши годы лучше объясняет другой расклад (${best.label}): совпало ${rate(best)}, а у разбора по формуле — ${rate(base)}. Мы проверяли ${hypos.length} вариантов, поэтому это повод пересмотреть, а не доказательство.`;
  } else if (base.hits / Math.max(1, n) >= 0.6 && base.net >= best.net - 1) {
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
    const a = analyze(c), h = score(a.brain, c, evs, 'h', '');
    out.push({ hour: k, time, hits: h.hits, miss: h.miss, yong: a.brain.yong });
  }
  return out.sort((x, y) => (y.hits - y.miss) - (x.hits - x.miss));
}
