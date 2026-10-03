// Календарь дней для карты: каждый день — столп цикла 60, его стихии против полезных/нагрузочных стихий карты,
// удары (冲/刑/害) по ветвям карты, пустота (空亡) и «божество дня» → что делать.
import { SunPosition } from 'astronomy-engine';
import { STEMS, BRANCHES, cyc, godOf, type God } from './core';
import { lichun, yearIdx, type Chart, type Analysis, type Pos } from './calc';

export type DayType = 'peak' | 'peak-hit' | 'calm' | 'heavy';
export interface DayInfo { iso: string; idx: number; monthIdx: number; type: DayType; god: God; act: string; notes: string[] }

export const DAY_TYPE: Record<DayType, { ru: string; hint: string }> = {
  peak: { ru: 'Сильный', hint: 'главные шаги: переговоры, запуски, оплаты, публикации' },
  'peak-hit': { ru: 'Сильный с ударом', hint: 'работать можно, решения — после проверки' },
  calm: { ru: 'Ровный', hint: 'обычная работа, доводить начатое' },
  heavy: { ru: 'Нагрузка', hint: 'рутина, учёба, отдых; важного не начинать, крупно не тратить' },
};

export const GOD_ACT: Record<string, string> = {
  SS: 'создавать: продукт, контент, обучение — то, что делаете руками и головой',
  SG: 'продавать и выступать: питчи, переговоры, реклама, слово от первого лица; не спорить с начальством и законом',
  PC: 'сделки: новые клиенты, инвестиции, крупные покупки, торговля',
  ZC: 'деньги в порядок: счета, долги, договоры с регулярной оплатой, бюджет; хорошо для партнёрств',
  QS: 'трудные задачи и дедлайны: брать вызов, но без лобовых конфликтов',
  ZG: 'документы, статус, официальные дела, репутация',
  PY: 'исследовать, искать нестандартные решения, побыть одному',
  ZY: 'учиться, просить поддержки, оформлять бумаги, восстанавливаться',
  BJ: 'работать с партнёрами и командой, держать свою линию',
  JC: 'осторожно с деньгами: соперники и азарт — крупно не рисковать',
};

const POS_AREA: Record<Pos, string> = { day: 'дом, близкие, тело', hour: 'дети, планы, сон', month: 'работа, родители', year: 'род, корни, старшие' };
const POS_OF: Record<Pos, string> = { day: 'ветвь дня', hour: 'час', month: 'месяц', year: 'год' };
const PUNISH: number[][] = [[2, 5, 8], [1, 10, 7], [0, 3]];
const HARM: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const norm = (x: number) => ((x % 360) + 360) % 360;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const D0 = Date.UTC(2000, 0, 1); // 2000-01-01 = 戊午 (54)

export const dayIdx = (y: number, m: number, d: number) => mod(Math.round((Date.UTC(y, m - 1, d) - D0) / 864e5) + 54, 60);

const lcCache = new Map<number, number>();
const lc = (y: number) => { if (!lcCache.has(y)) lcCache.set(y, lichun(y).getTime()); return lcCache.get(y)!; };
export function monthIdxAt(t: Date): number {
  let Y = t.getUTCFullYear();
  if (t.getTime() < lc(Y)) Y -= 1;
  const yi = yearIdx(Y), m = Math.floor(norm(SunPosition(t).elon - 315) / 30);
  return cyc((((yi % 10) % 5) * 2 + 2 + m) % 10, (2 + m) % 12);
}

export function dayInfo(c: Chart, a: Analysis, y: number, m: number, d: number): DayInfo {
  const idx = dayIdx(y, m, d), s = idx % 10, b = idx % 12;
  const fav = (e: number) => (a.consensus as number[]).includes(e), bad = (e: number) => (a.avoid as number[]).includes(e);
  const se = STEMS[s].el, be = BRANCHES[b].el;
  let type: DayType = fav(se) && !bad(be) ? 'peak' : bad(se) || bad(be) ? 'heavy' : 'calm';
  const notes: string[] = [];
  let hit = false;
  for (const p of c.pillars) {
    const pb = p.branch;
    if (Math.abs(pb - b) === 6) { notes.push(`${BRANCHES[b].animal} бьёт ${BRANCHES[pb].animal} (${POS_OF[p.pos]}): ${POS_AREA[p.pos]}`); if (p.pos === 'day' || p.pos === 'hour') hit = true; }
    if (p.pos === 'day') {
      if (Math.abs(pb - b) !== 6 && PUNISH.some((set) => set.includes(pb) && set.includes(b) && pb !== b)) { notes.push('трение с ветвью дня: документы, закон, близкие — без конфликтов'); hit = true; }
      if (HARM.some(([x, z]) => (x === pb && z === b) || (x === b && z === pb))) notes.push('скрытое трение: перепроверять договорённости');
    }
  }
  if (a.voids.includes(b)) notes.push('пустой знак карты: результат может прийти неполным');
  if (hit && type === 'peak') type = 'peak-hit';
  const god = godOf(a.dm, s);
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { iso, idx, monthIdx: monthIdxAt(new Date(Date.UTC(y, m - 1, d, 12))), type, god, act: GOD_ACT[god.key], notes };
}

export function daysFrom(c: Chart, a: Analysis, start: Date, n: number): DayInfo[] {
  const out: DayInfo[] = [];
  for (let k = 0; k < n; k++) {
    const t = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
    out.push(dayInfo(c, a, t.getFullYear(), t.getMonth() + 1, t.getDate()));
  }
  return out;
}

// «Покажи → закрой»: день выражения (Бог еды / Бунтарь), за ним день богатства — оба сильные, без ударов.
export function showThenClose(days: DayInfo[]): [DayInfo, DayInfo][] {
  const out: [DayInfo, DayInfo][] = [];
  for (let k = 0; k + 1 < days.length; k++) {
    const x = days[k], y = days[k + 1];
    if (x.type === 'peak' && y.type === 'peak' && ['SS', 'SG'].includes(x.god.key) && ['PC', 'ZC'].includes(y.god.key)) out.push([x, y]);
  }
  return out;
}
