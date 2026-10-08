// Календарь дней для карты: каждый день — столп цикла 60, его стихии против полезных/нагрузочных стихий карты,
// удары (冲/刑/害) по ветвям карты, пустота (空亡) и «божество дня» → что делать.
import { SunPosition } from 'astronomy-engine';
import { STEMS, BRANCHES, EL, cyc, gen, godOf, type God, type El } from './core';
import { lichun, yearIdx, type Chart, type Analysis, type Pos } from './calc';
import { activeSet, periodVerdict, tianKeDiChong } from './brain';

export type DayType = 'peak' | 'peak-hit' | 'calm' | 'heavy';
export type BgTone = 'good' | 'bad' | 'mixed' | 'calm';
/** Фон дня: такт и год (KB 11; день — перенос метода, KB 17 §6). fav/avoid — набор, действующий в этом такте. */
export interface DayBg { luck: BgTone | null; year: BgTone; adj: number; swung: boolean }
export interface DayInfo extends DayAdvice { iso: string; idx: number; monthIdx: number; type: DayType; god: God; act: string; notes: string[]; bg: DayBg; fav: El[]; avoid: El[] }

export const DAY_TYPE: Record<DayType, { ru: string; hint: string }> = {
  peak: { ru: 'Сильный', hint: 'главные шаги: переговоры, запуски, оплаты, публикации' },
  'peak-hit': { ru: 'Сильный, но с риском', hint: 'работать можно, решения — после проверки' },
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
  JC: 'с деньгами осторожно — рядом соперники и азарт, крупно не рисковать',
};

const POS_AREA: Record<Pos, string> = { day: 'дом, близкие, тело', hour: 'дети, планы, сон', month: 'работа, родители', year: 'род, корни, старшие' };
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

const TV: Record<BgTone, number> = { good: 1, bad: -1, mixed: 0, calm: 0 };
const bgCache = new WeakMap<Analysis, Map<number, { A: Analysis; bg: DayBg; yi: number }>>();
/** Год бацзы и такт на дату → фон и действующий набор полезных стихий (кэш по году). */
function background(c: Chart, a: Analysis, t: Date): { A: Analysis; bg: DayBg; yi: number } {
  const Y = t.getTime() < lc(t.getUTCFullYear()) ? t.getUTCFullYear() - 1 : t.getUTCFullYear();
  let m = bgCache.get(a); if (!m) bgCache.set(a, (m = new Map()));
  const hit = m.get(Y); if (hit) return hit;
  const L = [...c.luck].reverse().find((l) => l.year <= Y), yi = yearIdx(Y);
  const { set, swung } = L ? activeSet(a.brain, L.idx, c) : { set: a.brain, swung: false };
  const A: Analysis = swung ? { ...a, consensus: [set.yong, ...set.xi], avoid: set.ji, brain: { ...a.brain, ...set } } : a;
  const luck = L ? periodVerdict(a.brain, L.idx, c).tone : null, year = periodVerdict(a.brain, yi, c, L?.idx).tone;
  // Фон сдвигает оценку дня не больше чем на полбалла; год = такт (岁运并临, «灾祥庚大» — 命理约言) — в полтора раза.
  const adj = 0.25 * ((luck ? TV[luck] : 0) + TV[year]) * (L && L.idx === yi ? 1.5 : 1);
  const r = { A, bg: { luck, year, adj, swung }, yi };
  m.set(Y, r); return r;
}

export function dayInfo(c: Chart, a0: Analysis, y: number, m: number, d: number): DayInfo {
  const { A: a, bg, yi } = background(c, a0, new Date(Date.UTC(y, m - 1, d, 12)));
  const idx = dayIdx(y, m, d), s = idx % 10, b = idx % 12;
  const fav = (e: number) => (a.consensus as number[]).includes(e), bad = (e: number) => (a.avoid as number[]).includes(e);
  const se = STEMS[s].el, be = BRANCHES[b].el;
  // Ветвь вредна, если это главный вред карты; второстепенный вред под полезным стволом, который она рождает,
  // работает как корень этого ствола (ДТС 天覆地载): 丙寅 при полезном Огне — сильный день, а не тяжёлый.
  const branchBad = be === a.avoid[0] || (bad(be) && !(fav(se) && (be + 1) % 5 === se));
  let type: DayType = fav(se) && !branchBad ? 'peak' : bad(se) || branchBad ? 'heavy' : 'calm';
  const notes: string[] = [];
  let hit = false;
  for (const p of c.pillars) {
    const pb = p.branch;
    if (Math.abs(pb - b) === 6) { notes.push(`встряска в сфере «${POS_AREA[p.pos]}»`); if (p.pos === 'day' || p.pos === 'hour') hit = true; }
    if (p.pos === 'day') {
      if (Math.abs(pb - b) !== 6 && PUNISH.some((set) => set.includes(pb) && set.includes(b) && pb !== b)) { notes.push('трения с документами, законом и близкими — без конфликтов'); hit = true; }
      if (HARM.some(([x, z]) => (x === pb && z === b) || (x === b && z === pb))) notes.push('возможны недопонимания — перепроверяйте договорённости');
    }
  }
  // 空亡 (命理约言 空亡论): пустая ветвь, которая есть в карте, «заполняется» (填实); которой нет — слабая пустота
  const inChart = c.pillars.some((p) => p.branch === b);
  if (a.voids.includes(b) && !inChart) notes.push('результат может прийти неполным');
  const day = c.pillars.find((p) => p.pos === 'day')!;
  if (tianKeDiChong(idx, day.idx)) { notes.push('двойной удар по вам лично — день для тишины, не для решений'); hit = true; }
  if (Math.abs((yi % 12) - b) === 6) notes.push('день спорит с текущим годом — крупное не начинать');
  if (hit && type === 'peak') type = 'peak-hit';
  const god = godOf(a.dm, s);
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const monthIdx = monthIdxAt(new Date(Date.UTC(y, m - 1, d, 12)));
  return { iso, idx, monthIdx, type, god, act: GOD_ACT[god.key], notes, bg, fav: a.consensus, avoid: a.avoid, ...advice(c, a, idx, monthIdx, type, yi, bg.adj) };
}

// ——— Подсказка дня (KB 17 §5; tools/today.py) ———
// 病药 (神峰通考 «病药说»): если день несёт вредную стихию — «лекарство»: сначала стихия, в которую вред
// перетекает (通关, если она полезна), иначе та, что его сдерживает; если день полезный — опираться на него.
export interface DayAdvice {
  score: number; heal: boolean; med: El; why: string; warn: string[]; good: string[];
  add: { theory: string; folk: string };
}
const BRANCH_POS_W: Record<Pos, number> = { day: 1, month: 0.5, year: 0.25, hour: 0.25 };
const SIX = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const SELF_PUNISH = [4, 6, 9, 11];
const WET = [1, 4]; // мокрая земля (丑辰): копит Воду, не греет (KB 09; 千里命稿 «燥湿»)
// Слой B — 五行大义 т. 3 «论杂配» (нрав, вкус); слой C — народная практика, в классике нет (KB 17 §2, §4)
export const EL_ADD: Record<El, { theory: string; folk: string }> = {
  0: { theory: 'расти и помогать: начать учёбу, помочь человеку, посеять новую идею; кислый вкус', folk: 'зелёный цвет; восточная сторона, растения, утро' },
  1: { theory: 'показать себя: выступить, опубликовать, быть на людях, сделать красиво; горький вкус', folk: 'красный, оранжевый; солнце, свет, южная сторона' },
  2: { theory: 'держать слово: довести обещанное до конца, закрыть сделку или счёт; сладкий вкус', folk: 'жёлтый, коричневый, бежевый; своё рабочее место, без лишних поездок' },
  3: { theory: 'решать и ставить границы: сказать «нет» лишнему, навести порядок, закрыть хвосты; острый вкус', folk: 'белый, серебристый; запад, чистое пространство' },
  4: { theory: 'думать и гибко подстраиваться: спланировать, послушать, разобраться в деталях; солёный вкус', folk: 'чёрный, синий; север, вода рядом' },
};
const roundEven = (x: number) => { const f = Math.floor(x), r = x - f; return r > 0.5 ? f + 1 : r < 0.5 ? f : f % 2 ? f + 1 : f; };
const ACC = ['Дерево', 'Огонь', 'Землю', 'Металл', 'Воду'];

function advice(c: Chart, a: Analysis, idx: number, monthIdx: number, type: DayType, yi: number, bgAdj: number): DayAdvice {
  const s = idx % 10, b = idx % 12, se = STEMS[s].el, be = BRANCHES[b].el;
  const fav = (e: number) => (a.consensus as number[]).includes(e), bad = (e: number) => (a.avoid as number[]).includes(e);
  const ill = [se, be].filter(bad) as El[];
  const heal = type === 'heavy' || ill.length > 0;
  let med: El, why: string;
  if (ill.length) {
    const x = ill.includes(a.avoid[0]) ? a.avoid[0] : ill[0];
    const ctlBy = ((x + 3) % 5) as El; // стихия, которая подавляет x
    if (fav(gen(x))) { med = gen(x); why = `${EL[x]} перетекает в ${ACC[med]} и становится полезной`; }
    else if (fav(ctlBy)) { med = ctlBy; why = `${EL[med]} сдерживает ${ACC[x]}`; }
    else { med = a.brain.yong; why = 'это ваша главная полезная стихия'; }
  } else {
    med = fav(se) ? se : fav(be) ? be : a.brain.yong;
    why = fav(se) || fav(be) ? 'приходит в этот день без усилий — опирайтесь на это' : 'это ваша главная полезная стихия';
  }
  // база — как в tools/today.py: только полезные стихии → 4, только вредные → 2, смесь или нейтраль → 3
  // мокрая земля под водным стволом не лечит Воду — день считается нагрузкой (today.py)
  const anyFav = fav(se) || (fav(be) && !(WET.includes(b) && se === 4 && bad(4)));
  let score = ill.length && !anyFav ? 2 : ill.length || !anyFav ? 3 : 4;
  const warn: string[] = [], good: string[] = [];
  for (const p of c.pillars) {
    const pb = p.branch, ps = p.stem;
    if (Math.abs(pb - b) === 6) score -= BRANCH_POS_W[p.pos];
    // 刑 со всеми столпами (вес по столпу, как удар), включая самонаказание 辰午酉亥
    if (Math.abs(pb - b) !== 6 && (PUNISH.some((set) => set.includes(pb) && set.includes(b) && pb !== b) || (pb === b && SELF_PUNISH.includes(b)))) {
      score -= BRANCH_POS_W[p.pos];
      if (p.pos !== 'day') warn.push(`трения в сфере «${POS_AREA[p.pos]}» — без резких шагов`);
    }
    if (p.pos === 'day' && SIX.some(([x, z]) => (x === pb && z === b) || (x === b && z === pb))) good.push(`притяжение в сфере «${POS_AREA.day}» — хорошо договариваться`);
    // стволы: союз (разница 5) и удар (甲庚 乙辛 丙壬 丁癸) — 子平真诠 гл. 4–5; 三命通会 т. 2
    if (p.pos === 'day' && Math.abs(ps - s) === 5) { score += 0.5; good.push('день тянется к вам: деньги или партнёр сами идут навстречу — условия записывать'); }
    if (Math.abs(ps - s) === 6 && Math.min(ps, s) < 4) {
      if (p.pos === 'day') { score -= 1; warn.push('давление на вас лично — не лезть на рожон'); }
      else { score -= BRANCH_POS_W[p.pos]; warn.push(`напряжение в сфере «${POS_AREA[p.pos]}»`); }
    }
  }
  // 争合: ствол дня тянется к стволу карты, к которому уже тянется такой же ствол карты (KB 10)
  const nat = c.pillars.map((p) => p.stem);
  if (c.pillars.some((p) => p.pos !== 'day' && Math.abs(p.stem - s) === 5) && nat.includes(s) && !c.pillars.some((p) => p.pos === 'day' && Math.abs(p.stem - s) === 5)) { score -= 0.5; warn.push('появляется соперник за деньги или партнёра — долей не делиться'); }
  // 月破: ветвь дня бьёт ветвь месяца (协纪辨方)
  if (Math.abs(monthIdx % 12 - b) === 6) { score -= 1; warn.push('день бьёт месяц: крупно не тратить, в долг не давать, далеко за деньгами не ехать'); }
  if (a.voids.includes(b) && !c.pillars.some((p) => p.branch === b)) score -= 0.25;
  // 岁破: ветвь дня бьёт ветвь года (协纪辨方) — день против года
  if (Math.abs((yi % 12) - b) === 6) score -= 0.5;
  score += bgAdj;
  if (WET.includes(b) && bad(4) && fav(2)) { score -= 0.5; warn.push('земля дня влажная — сдерживает слабее'); }
  // ствол дня уходит в союз со стволом карты (не с вами) и превращается во вредную стихию — сила дня слабее
  for (const p of c.pillars) if (p.pos !== 'day' && Math.abs(p.stem - s) === 5 && fav(se) && bad((Math.min(p.stem, s) % 5 + 2) % 5)) {
    score -= 0.5; warn.push('полезная стихия дня уходит в союз — действует слабее'); break;
  }
  return { score: Math.max(1, Math.min(5, roundEven(score))), heal, med, why, warn, good, add: EL_ADD[med] };
}

// Лучшие двухчасовые отрезки дня: стихия-лекарство в стволе или ветви часа, без вредных стихий и удара по ветви дня.
// shift — сколько часов прибавить к солнечному времени, чтобы получить время на часах.
export function bestHours(_a: Analysis, d: DayInfo, shift = 0, from = 7, to = 23): string[] {
  const ds = d.idx % 10, db = d.idx % 12, med = d.med;
  const fav = (e: number) => (d.fav as number[]).includes(e), bad = (e: number) => (d.avoid as number[]).includes(e);
  const fm = (x: number) => { const m = Math.round(x * 12) * 5; return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const res: { a: number; t: string; best: boolean }[] = [];
  for (let k = 0; k < 12; k++) {
    const hs = ((ds % 5) * 2 + k) % 10, es = STEMS[hs].el, eb = BRANCHES[k].el;
    if (Math.abs(k - db) === 6 || bad(es) || bad(eb)) continue;
    if (med !== es && med !== eb && !(fav(es) && fav(eb))) continue;
    if (med === 2 && WET.includes(k) && es !== 2 && d.avoid.includes(4)) continue;
    let st = mod(k * 2 - 1 + shift, 24); if (st < from - 0.01) st += 24;
    if (st + 2 > to + 0.01) continue;
    res.push({ a: st, t: `${fm(st)}–${fm(st + 2)}`, best: (med === es || med === eb) && fav(es) && fav(eb) });
  }
  res.sort((x, y) => x.a - y.a);
  const top = res.filter((r) => r.best);
  return (top.length ? top : res).map((r) => r.t).slice(0, 3);
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
