// Год по месяцам (流月) и десятилетие по годам: тон — periodVerdict мозга (KB 11), дело месяца — бог ствола (GOD_ACT),
// удары по ветви дня и месяца (СМ т.10; ЦЛ). Месяц начинается в «цзе» (节), год — в 立春.
import { SearchSunLongitude } from 'astronomy-engine';
import { STEMS, BRANCHES, EL, godOf, type El } from './core';
import { lichun, yearIdx, type Analysis, type Chart } from './calc';
import { periodVerdict } from './brain';
import { GOD_ACT } from './days';
import { luckDetail } from './reading';

export type Tone = 'good' | 'bad' | 'mixed' | 'calm';
export interface Period { idx: number; tone: Tone; text: string; why: string; act: string; hits: string[]; swing?: string }
export interface MonthF extends Period { start: Date }
export interface YearF extends Period { year: number; start: Date; end: Date; luck?: { idx: number; tone: Tone; from: number } ; months: MonthF[] }

const clash = (x: number, y: number) => Math.abs(x - y) === 6;
const TONE_RU: Record<Tone, string> = { good: 'благоприятно', bad: 'нагрузка', mixed: 'смешанно', calm: 'спокойно' };
export const toneRu = (t: Tone) => TONE_RU[t];

function period(c: Chart, a: Analysis, idx: number, partner?: number): Period {
  const v = periodVerdict(a.brain, idx, c, partner), g = godOf(a.dm, idx % 10);
  const day = c.pillars.find((p) => p.pos === 'day')!, month = c.pillars.find((p) => p.pos === 'month')!;
  const hits: string[] = [];
  if (clash(idx % 12, day.branch)) hits.push('перемены в доме, паре, здоровье');
  if (clash(idx % 12, month.branch)) hits.push('встряска в работе и основе жизни');
  // Метки стихий — по тому же набору 用/喜/忌, что и тон (при силе «на грани» такт/год его меняет), и по стихии ствола после союза.
  const S = v.set, r = (e: El) => (S.yong === e ? 'главное полезное' : S.xi.includes(e) ? 'полезно' : S.ji.includes(e) ? 'нагрузка' : 'нейтрально');
  const se = v.se, be = BRANCHES[idx % 12].el;
  const why = se === be ? `${EL[se]} — ${r(se)}` : `${EL[se]} — ${r(se)}, ${EL[be].toLowerCase()} — ${r(be)}`;
  // Сила «на грани»: в этом периоде полезное другое, чем обычно, — сказать прямо, иначе метки месяцев «прыгают» без причины.
  const swing = v.swung ? `сила на грани: в этот период полезнее ${EL[S.yong].toLowerCase()}, а не ${EL[a.brain.yong].toLowerCase()}` : undefined;
  return { idx, tone: v.tone, text: v.text, why, act: `«${g.ru}» — ${GOD_ACT[g.key]}`, hits, swing };
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
  const L = luckAt(c, Y);
  return {
    year: Y, start, end, months, ...period(c, a, yearIdx(Y), L?.idx),
    luck: L && { idx: L.idx, tone: periodVerdict(a.brain, L.idx, c).tone, from: L.year },
  };
}

/** Десять лет: тон, смысл и подробности (стадия, удары, климат) — из luckDetail. */
export function decade(c: Chart, a: Analysis, from: number): (Period & { year: number; detail: string[] })[] {
  return Array.from({ length: 10 }, (_, i) => {
    const y = from + i, idx = yearIdx(y);
    return { year: y, ...period(c, a, idx, luckAt(c, y)?.idx), detail: luckDetail(c, a, idx).filter((t) => !/^(Ваша стихия в этот период|Проявляется главная тема)/.test(t)) };
  });
}

/** Такт, идущий в год бацзы Y. */
export const luckAt = (c: Chart, Y: number) => [...c.luck].reverse().find((l) => l.year <= Y);

/** Текущий год бацзы: до 立春 — ещё прошлый. */
export const baziYear = (t = new Date()) => (t < lichun(t.getUTCFullYear()) ? t.getUTCFullYear() - 1 : t.getUTCFullYear());
export const pillarZh = (idx: number) => STEMS[idx % 10].zh + BRANCHES[idx % 12].zh;
