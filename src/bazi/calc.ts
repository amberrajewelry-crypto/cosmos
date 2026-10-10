// Бацзы: астрономический календарь + анализ. Границы года/месяцев — реальные моменты
// солнечных сезонов (долгота Солнца, astronomy-engine), час — по поясному или истинному солнечному времени.
import { SunPosition, SearchSunLongitude, HourAngle, Body, Observer } from 'astronomy-engine';
import { localToUtc } from '../compute/localtime';
import { brain, type Brain } from './brain';
import {
  STEMS, BRANCHES, cyc, godOf, hiddenOf, stageOf, nayinOf, voidOf, gen, ctl, seasonState, type El, type God,
} from './core';

export interface BirthInput { date: string; time: string; timeKnown: boolean; tz?: string; lat: number; lon: number; male: boolean; place?: string }
export interface Variant { zi: '23' | '00'; solar: boolean; south: boolean }
export const variantLabel = (v: Variant): string =>
  `${v.solar ? 'истинное солнечное' : 'поясное'} время · сутки с ${v.zi === '23' ? '23:00' : '00:00'}${v.south ? ' · сезоны юга' : ''}`;

export type Pos = 'hour' | 'day' | 'month' | 'year';
export const POS_RU: Record<Pos, string> = { hour: 'Час', day: 'День', month: 'Месяц', year: 'Год' };
export const POS_SENSE: Record<Pos, string> = {
  year: 'корни, род, детство, общество', month: 'родители, карьера, юность, среда',
  day: 'вы сами и партнёр', hour: 'дети, замыслы, поздние годы',
};

export interface Pillar { pos: Pos; idx: number; stem: number; branch: number }
export interface Luck { idx: number; age: number; year: number }
export interface Chart {
  input: BirthInput; variant: Variant; utc: Date;
  local: { y: number; m: number; d: number; h: number; min: number }; eotMin: number;
  sunLon: number; termIdx: number; pillars: Pillar[]; // порядок: час, день, месяц, год (час может отсутствовать)
  forward: boolean; startAge: number; luck: Luck[]; jieDays: number;
}

const JIE_OFFSET = 15; // «цзе» — сезоны, открывающие месяц: 315°, 345°, 15° …
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
const norm = (x: number) => ((x % 360) + 360) % 360;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function lichun(y: number): Date {
  return SearchSunLongitude(315, new Date(Date.UTC(y, 0, 25)), 30)!.date;
}
export const yearIdx = (y: number) => mod(y - 4, 60);

export function computeChart(input: BirthInput, variant: Variant): Chart {
  const utc = localToUtc(input.date, input.time, input.tz);
  const sunLon = norm(SunPosition(utc).elon);
  // Год — от Личунь.
  let Y = utc.getUTCFullYear();
  if (utc < lichun(Y)) Y -= 1;
  const yi = yearIdx(Y);
  // Месяц — от «цзе».
  let m = Math.floor(norm(sunLon - 315) / 30);
  if (variant.south) m = (m + 6) % 12;
  const ms = ((yi % 10) % 5) * 2 + 2;
  const mi = cyc((ms + m) % 10, (2 + m) % 12);
  // Местное время: поясное или истинное солнечное.
  let local: Chart['local'], eotMin = 0;
  const [cy, cm, cd] = input.date.split('-').map(Number), [ch, cmin] = input.time.split(':').map(Number);
  const meanMs = utc.getTime() + input.lon * 240000;
  const ha = HourAngle(Body.Sun, utc, new Observer(input.lat, input.lon, 0));
  const solarH = mod(ha + 12, 24);
  const meanDt = new Date(meanMs), meanH = meanDt.getUTCHours() + meanDt.getUTCMinutes() / 60 + meanDt.getUTCSeconds() / 3600;
  eotMin = (mod(solarH - meanH + 12, 24) - 12) * 60;
  if (variant.solar) {
    const t = new Date(meanMs + eotMin * 60000);
    local = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes() };
  } else local = { y: cy, m: cm, d: cd, h: ch, min: cmin };
  // День: 2000-01-01 = У-У (54) ⇒ (JDN+49) mod 60.
  let J = jdn(local.y, local.m, local.d);
  const late = local.h >= 23;
  if (late && variant.zi === '23') J += 1;
  const di = mod(J + 49, 60);
  const pillars: Pillar[] = [];
  if (input.timeKnown) {
    const hb = Math.floor((local.h + 1) / 2) % 12;
    const ds = late && variant.zi === '00' ? (di + 1) % 10 : di % 10;
    const hi = cyc(((ds % 5) * 2 + hb) % 10, hb);
    pillars.push({ pos: 'hour', idx: hi, stem: hi % 10, branch: hi % 12 });
  }
  pillars.push({ pos: 'day', idx: di, stem: di % 10, branch: di % 12 });
  pillars.push({ pos: 'month', idx: mi, stem: mi % 10, branch: mi % 12 });
  pillars.push({ pos: 'year', idx: yi, stem: yi % 10, branch: yi % 12 });
  // Такты удачи: направление по полярности года и полу; старт = дни до «цзе» / 3.
  const forward = STEMS[yi % 10].yang === input.male;
  const nextLon = norm(JIE_OFFSET + 30 * Math.ceil((sunLon - JIE_OFFSET + 1e-9) / 30));
  let jieDays: number;
  if (forward) {
    const t = SearchSunLongitude(nextLon, utc, 40)!.date;
    jieDays = (t.getTime() - utc.getTime()) / 864e5;
  } else {
    const t = SearchSunLongitude(norm(nextLon - 30), new Date(utc.getTime() - 40 * 864e5), 45)!.date;
    jieDays = (utc.getTime() - t.getTime()) / 864e5;
  }
  const startAge = jieDays / 3;
  const birthYearFrac = utc.getUTCFullYear() + (utc.getTime() - Date.UTC(utc.getUTCFullYear(), 0, 1)) / 31557600000;
  const luck: Luck[] = [];
  for (let k = 1; k <= 9; k++) {
    const age = startAge + (k - 1) * 10;
    luck.push({ idx: mod(mi + (forward ? k : -k), 60), age, year: Math.floor(birthYearFrac + age) });
  }
  return { input, variant, utc, local, eotMin, sunLon, termIdx: Math.floor(norm(sunLon - 315) / 15), pillars, forward, startAge, luck, jieDays };
}

// ——— Анализ ———
export interface Interaction { kind: string; label: string; a: Pos; b: Pos; c?: Pos; el?: El; tone: 'harm' | 'join' | 'mixed'; stems?: boolean }
export interface Analysis {
  dm: number; dmEl: El; scores: number[]; pct: number[]; support: number; ratio: number;
  strength: string; strengthKey: 'vweak' | 'weak' | 'sweak' | 'sstrong' | 'strong' | 'vstrong';
  season: number; monthEl: El;
  useful: { method: string; fav: El[]; unfav: El[]; why: string }[]; consensus: El[]; avoid: El[];
  gods: Record<string, number>; interactions: Interaction[]; stars: { name: string; pos: Pos[]; sense: string; folk?: string }[];
  voids: number[]; brain: Brain;
}

const CLASH = (a: number, b: number) => Math.abs(a - b) === 6;
const SIX: [number, number, El][] = [[0, 1, 2], [2, 11, 0], [3, 10, 1], [4, 9, 3], [5, 8, 4], [6, 7, 1]];
const TRINE: [number[], El][] = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]];
const DIRS: [number[], El][] = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]];
const HARM: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const PUNISH: [number[], string][] = [[[2, 5, 8], 'наказание неблагодарности'], [[1, 10, 7], 'наказание силой'], [[0, 3], 'наказание неучтивости']];
const STEM_COMBO: [number, number, El][] = [[0, 5, 2], [1, 6, 3], [2, 7, 4], [3, 8, 0], [4, 9, 1]];

export function analyze(c: Chart): Analysis {
  const P = c.pillars, day = P.find((p) => p.pos === 'day')!, month = P.find((p) => p.pos === 'month')!;
  const dm = day.stem, dmEl = STEMS[dm].el;
  const scores = [0, 0, 0, 0, 0];
  const gods: Record<string, number> = {};
  const addGod = (g: God, w: number) => (gods[g.key] = (gods[g.key] ?? 0) + w);
  for (const p of P) {
    if (p.pos !== 'day') { scores[STEMS[p.stem].el] += 1; addGod(godOf(dm, p.stem), 1); }
    const bw = p.pos === 'month' ? 2 : 1;
    for (const h of hiddenOf(p.branch)) { scores[STEMS[h.stem].el] += h.w * bw; addGod(godOf(dm, h.stem), h.w * bw); }
  }
  const withDm = scores.slice(); withDm[dmEl] += 1;
  const tot = withDm.reduce((a, b) => a + b, 0);
  const pct = withDm.map((s) => s / tot);
  const res = ((dmEl + 4) % 5) as El;
  const support = scores[dmEl] + scores[res];
  const total = scores.reduce((a, b) => a + b, 0);
  const ratio = support / total;
  const strengthKey = ratio < 0.2 ? 'vweak' : ratio < 0.4 ? 'weak' : ratio < 0.5 ? 'sweak' : ratio < 0.6 ? 'sstrong' : ratio < 0.8 ? 'strong' : 'vstrong';
  const strength = { vweak: 'крайне слабый', weak: 'слабый', sweak: 'слегка слабый', sstrong: 'слегка сильный', strong: 'сильный', vstrong: 'крайне сильный' }[strengthKey];
  const monthEl = BRANCHES[month.branch].el;
  const season = seasonState(dmEl, monthEl);

  const out = gen(dmEl), wealth = ctl(dmEl), officer = ((dmEl + 3) % 5) as El;
  const useful: Analysis['useful'] = [];
  // 1. Баланс силы (扶抑).
  if (ratio < 0.5) useful.push({ method: 'Баланс силы', fav: [res, dmEl], unfav: [officer, wealth, out], why: 'Господин дня слаб — нужны ресурс и опора' });
  else {
    const drain: El[] = scores[res] > scores[dmEl] ? [wealth, out, officer] : [officer, out, wealth];
    useful.push({ method: 'Баланс силы', fav: drain, unfav: [res, dmEl], why: scores[res] > scores[dmEl] ? 'силён за счёт ресурса — его сдерживает Богатство' : 'силён за счёт опоры — нужны Власть и выражение' });
  }
  // 2. Климат (调候): зима требует Огня, лето — Воды.
  const mb = month.branch;
  if ([11, 0, 1].includes(mb)) useful.push({ method: 'Климат', fav: [1, 0], unfav: [4], why: 'рождение зимой — карта холодная, нужен Огонь' });
  else if ([5, 6, 7].includes(mb)) useful.push({ method: 'Климат', fav: [4, 3], unfav: [1], why: 'рождение летом — карта жаркая и сухая, нужна Вода' });
  // 3. Следование (从格) — только при крайней силе/слабости.
  if (ratio < 0.2) {
    const dom = [out, wealth, officer].sort((a, b) => scores[b] - scores[a])[0];
    useful.push({ method: 'Следование', fav: [dom, gen(dom) === dmEl ? out : gen(dom)], unfav: [res, dmEl], why: 'Господин дня почти без опоры — он «следует» за сильнейшей стихией' });
  } else if (ratio > 0.8) useful.push({ method: 'Следование', fav: [dmEl, res], unfav: [officer], why: 'опора подавляющая — выгодно идти по её течению' });
  const vote = [0, 0, 0, 0, 0];
  for (const u of useful) { u.fav.forEach((e, i) => (vote[e] += i === 0 ? 2 : 1)); u.unfav.forEach((e) => (vote[e] -= 1)); }
  const order = [0, 1, 2, 3, 4].sort((a, b) => vote[b] - vote[a]) as El[];
  const consensus = order.filter((e) => vote[e] > 0).slice(0, 2);
  const avoid = order.filter((e) => vote[e] < 0).reverse().slice(0, 2);

  // Взаимодействия.
  const I: Interaction[] = [];
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (CLASH(a.branch, b.branch)) I.push({ kind: 'clash', label: `Столкновение ${BRANCHES[a.branch].animal}–${BRANCHES[b.branch].animal}`, a: a.pos, b: b.pos, tone: 'harm' });
    for (const [x, y, el] of SIX) if ((a.branch === x && b.branch === y) || (a.branch === y && b.branch === x))
      I.push({ kind: 'six', label: `Союз ${BRANCHES[a.branch].animal}–${BRANCHES[b.branch].animal} → ${['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'][el]}`, a: a.pos, b: b.pos, el, tone: 'join' });
    for (const [x, y] of HARM) if ((a.branch === x && b.branch === y) || (a.branch === y && b.branch === x))
      I.push({ kind: 'harm', label: `Скрытое трение ${BRANCHES[a.branch].animal}–${BRANCHES[b.branch].animal}`, a: a.pos, b: b.pos, tone: 'harm' });
    for (const [set, name] of PUNISH) if (set.includes(a.branch) && set.includes(b.branch) && a.branch !== b.branch)
      I.push({ kind: 'punish', label: `${name[0].toUpperCase() + name.slice(1)}`, a: a.pos, b: b.pos, tone: 'harm' });
    if (a.branch === b.branch && [4, 6, 9, 11].includes(a.branch))
      I.push({ kind: 'punish', label: `Самонаказание ${BRANCHES[a.branch].animal}`, a: a.pos, b: b.pos, tone: 'harm' });
    for (const [x, y, el] of STEM_COMBO) if ((a.stem === x && b.stem === y) || (a.stem === y && b.stem === x))
      I.push({ kind: 'scombo', label: `Союз ${STEMS[a.stem].ru}–${STEMS[b.stem].ru} → ${['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'][el]}`, a: a.pos, b: b.pos, el, tone: 'join', stems: true });
    if (Math.abs(a.stem - b.stem) === 6 && Math.min(a.stem, b.stem) < 4)
      I.push({ kind: 'sclash', label: `Столкновение стволов ${STEMS[a.stem].ru}–${STEMS[b.stem].ru}`, a: a.pos, b: b.pos, tone: 'harm', stems: true });
  }
  const has = (b: number) => P.filter((p) => p.branch === b).map((p) => p.pos);
  for (const [set, el] of TRINE) {
    const got = set.filter((b) => has(b).length);
    if (got.length === 3) I.push({ kind: 'trine', label: `Тройной союз → ${['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'][el]}`, a: has(set[0])[0], b: has(set[1])[0], c: has(set[2])[0], el, tone: 'join' });
    else if (got.length === 2 && got.includes(set[1])) I.push({ kind: 'half', label: `Неполный союз → ${['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'][el]}`, a: has(got[0])[0], b: has(got[1])[0], el, tone: 'join' });
  }
  for (const [set, el] of DIRS) if (set.every((b) => has(b).length))
    I.push({ kind: 'dir', label: `Сезонный союз → ${['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'][el]}`, a: has(set[0])[0], b: has(set[1])[0], c: has(set[2])[0], el, tone: 'join' });

  // Звёзды-символы.
  const stars: Analysis['stars'] = [];
  const NOBLE: Record<number, number[]> = { 0: [1, 7], 4: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [3, 5], 9: [3, 5], 6: [2, 6], 7: [2, 6] };
  const at = (bs: number[]) => P.filter((p) => bs.includes(p.branch)).map((p) => p.pos);
  const push = (name: string, bs: number[], sense: string, folk?: string) => { const pos = at(bs); if (pos.length) stars.push({ name, pos, sense, ...(folk ? { folk } : {}) }); };
  push('Благородный помощник', NOBLE[dm], 'люди приходят на помощь в трудный момент');
  push('Звезда учёности', [[5, 6, 8, 9, 8, 9, 11, 0, 2, 3][dm]], 'ум, учёба, экзамены, письмо', 'без механики в классике (KB 16)');
  const tri = (b: number) => TRINE.find(([s]) => s.includes(b))![0];
  const peach = (b: number) => ({ 8: 9, 2: 3, 5: 6, 11: 0 } as Record<number, number>)[tri(b)[0]];
  const horse = (b: number) => ({ 8: 2, 2: 8, 5: 11, 11: 5 } as Record<number, number>)[tri(b)[0]];
  const canopy = (b: number) => tri(b)[2];
  const yb = P.find((p) => p.pos === 'year')!.branch, dbr = day.branch;
  push('Цветок персика', [peach(yb), peach(dbr)], 'обаяние, популярность', 'ДТС: «咸池驿马，是后人之谬言»');
  push('Почтовая лошадь', [horse(yb), horse(dbr)], 'переезды, дорога, перемены');
  push('Цветной балдахин', [canopy(yb), canopy(dbr)], 'искусство, мистика, уединение', 'МЛЮЯ не включает в признанные');
  // 天德/月德 по месяцу рождения (五行精纪 «正丁二坤宫…庚居丑月内»; 千里命稿 月德): смягчают трудное (МЛЮЯ «助吉解凶»).
  const mi = (mb + 10) % 12;
  const TIANDE: [kind: 's' | 'b', v: number][] = [['s', 3], ['b', 8], ['s', 8], ['s', 7], ['b', 11], ['s', 0], ['s', 9], ['b', 2], ['s', 2], ['s', 1], ['b', 5], ['s', 6]];
  const YUEDE = [2, 8, 6, 0][[2, 6, 10].includes(mb) ? 0 : [8, 0, 4].includes(mb) ? 1 : [5, 9, 1].includes(mb) ? 2 : 3];
  const [tk, tv] = TIANDE[mi], byStem = (st: number) => P.filter((p) => p.stem === st).map((p) => p.pos);
  const td = tk === 's' ? byStem(tv) : at([tv]);
  if (td.length) stars.push({ name: 'Небесная добродетель', pos: td, sense: 'трудное смягчается, помощь приходит вовремя' });
  const yd = byStem(YUEDE);
  if (yd.length) stars.push({ name: 'Лунная добродетель', pos: yd, sense: 'смягчение бед, доброе имя' });
  if (STEMS[dm].yang) push('Клинок Ян', [[3, -1, 6, -1, 6, -1, 9, -1, 0, -1][dm]], 'резкая сила, решимость, риск травм и ссор');
  const voids = voidOf(day.idx);
  push('Пустота', voids, 'столп «в пустоте» — его тема ощущается нереальной или приходит с задержкой');
  const base = { dm, dmEl, scores, pct, support, ratio, strength, strengthKey, season, monthEl, useful, consensus, avoid, gods, interactions: I, stars, voids } as Analysis;
  // Полезные/вредные — по классике (brain.ts); расчёт трёх методов кода остаётся в useful для сравнения.
  base.brain = brain(c, base);
  base.consensus = [base.brain.yong, ...base.brain.xi];
  base.avoid = base.brain.ji;
  // Сила — по шкале классики (сезон + корни + стволы), её же показывают все разделы; ratio остаётся для шкалы «опора %».
  const sc = base.brain.power.score;
  base.strength = base.brain.power.ru;
  base.strengthKey = sc <= -6 ? 'vweak' : sc <= -3 ? 'weak' : sc <= 0 ? 'sweak' : sc <= 5 ? 'sstrong' : sc <= 8 ? 'strong' : 'vstrong';
  return base;
}

// Все варианты школ для одной даты.
export function allVariants(input: BirthInput): Variant[] {
  const out: Variant[] = [];
  for (const solar of [true, false]) for (const zi of ['23', '00'] as const) {
    out.push({ solar, zi, south: false });
    if (input.lat < 0) out.push({ solar, zi, south: true });
  }
  return out;
}
export const DEFAULT_VARIANT: Variant = { solar: true, zi: '23', south: false };

export { stageOf, nayinOf, godOf, hiddenOf };
