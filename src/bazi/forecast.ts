// Год по месяцам (流月) и десятилетие по годам: тон — periodVerdict мозга (KB 11), дело месяца — бог ствола (GOD_ACT),
// удары по ветви дня и месяца (СМ т.10; ЦЛ). Месяц начинается в «цзе» (节), год — в 立春.
import { SearchSunLongitude } from 'astronomy-engine';
import { STEMS, BRANCHES, EL, godOf, type El } from './core';
import { lichun, yearIdx, type Analysis, type Chart } from './calc';
import { periodVerdict } from './brain';
import { GOD_ACT } from './days';
import { luckDetail } from './reading';

export type Tone = 'good' | 'bad' | 'mixed' | 'calm';
export interface Period { idx: number; tone: Tone; text: string; why: string; act: string; hits: string[] }
export interface MonthF extends Period { start: Date }
export interface YearF extends Period { year: number; start: Date; end: Date; luck?: { idx: number; tone: Tone; from: number } ; months: MonthF[] }

const clash = (x: number, y: number) => Math.abs(x - y) === 6;
const TONE_RU: Record<Tone, string> = { good: 'благоприятно', bad: 'тяжело', mixed: 'смешанно', calm: 'спокойно' };
export const toneRu = (t: Tone) => TONE_RU[t];

function period(c: Chart, a: Analysis, idx: number): Period {
  const v = periodVerdict(a.brain, idx, c), g = godOf(a.dm, idx % 10);
  const day = c.pillars.find((p) => p.pos === 'day')!, month = c.pillars.find((p) => p.pos === 'month')!;
  const hits: string[] = [];
  if (clash(idx % 12, day.branch)) hits.push('удар по ветви дня: дом, партнёр, тело — перемены');
  if (clash(idx % 12, month.branch)) hits.push('удар по ветви месяца: работа и опора карты под нагрузкой');
  const r = (e: El) => (a.brain.yong === e ? 'главное полезное' : a.brain.xi.includes(e) ? 'полезно' : a.brain.ji.includes(e) ? 'нагрузка' : 'нейтрально');
  const se = STEMS[idx % 10].el, be = BRANCHES[idx % 12].el;
  const why = se === be ? `${EL[se]} и в стволе, и в ветви — ${r(se)}` : `ствол ${EL[se].toLowerCase()} — ${r(se)}, ветвь ${EL[be].toLowerCase()} — ${r(be)}`;
  return { idx, tone: v.tone, text: v.text, why, act: `«${g.ru}» — ${GOD_ACT[g.key]}`, hits };
}

/** Год бацзы (от 立春) с двенадцатью месяцами. */
export function yearForecast(c: Chart, a: Analysis, Y: number): YearF {
  const start = lichun(Y), end = lichun(Y + 1);
  const months: MonthF[] = [];
  for (let k = 0, t = start; k < 12; k++) {
    const ms = k ? SearchSunLongitude((315 + 30 * k) % 360, new Date(t.getTime() + 20 * 864e5), 20)!.date : start;
    const yi = yearIdx(Y), stem = (((yi % 10) % 5) * 2 + 2 + k) % 10, br = (2 + k) % 12;
    const idx = [...Array(60).keys()].find((i) => i % 10 === stem && i % 12 === br)!;
    months.push({ start: ms, ...period(c, a, idx) });
    t = ms;
  }
  const L = [...c.luck].reverse().find((l) => l.year <= Y);
  return {
    year: Y, start, end, months, ...period(c, a, yearIdx(Y)),
    luck: L && { idx: L.idx, tone: periodVerdict(a.brain, L.idx, c).tone, from: L.year },
  };
}

/** Десять лет: тон, смысл и подробности (стадия, удары, климат) — из luckDetail. */
export function decade(c: Chart, a: Analysis, from: number): (Period & { year: number; detail: string[] })[] {
  return Array.from({ length: 10 }, (_, i) => {
    const y = from + i, idx = yearIdx(y);
    return { year: y, ...period(c, a, idx), detail: luckDetail(c, a, idx) };
  });
}

/** Текущий год бацзы: до 立春 — ещё прошлый. */
export const baziYear = (t = new Date()) => (t < lichun(t.getUTCFullYear()) ? t.getUTCFullYear() - 1 : t.getUTCFullYear());
export const pillarZh = (idx: number) => STEMS[idx % 10].zh + BRANCHES[idx % 12].zh;
