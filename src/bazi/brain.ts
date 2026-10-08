// «Мозг» карты: структура (格局 / внешние 格) и полезный бог (用神) по классике — порядок из 命理约言 卷一 看用神法:
// сначала внешний格 (从/化/一行得气), иначе 扶抑 по корням (ЦПЦЦ гл.6, ДТС 衰旺), затем 调候 (穷通宝鉴; 命理约言 卷四),
// 通关 (ДТС) и 病药 (神峰通考). Результат питает разбор, такты и календарь дней (consensus/avoid в calc.ts).
import { STEMS, BRANCHES, EL, GODS, godOf, stageOf, seasonState, voidOf, type El } from './core';
import { rootOf, TIAOHOU } from './reading';
import type { Analysis, Chart } from './calc';

export const STRENGTH_RU = (score: number) =>
  score <= -6 ? 'крайне слабый' : score <= -3 ? 'слабый' : score <= -1 ? 'слегка слабый' : score <= 2 ? 'на грани' : score <= 5 ? 'слегка сильный' : score <= 8 ? 'сильный' : 'крайне сильный';

export interface Step { title: string; text: string; src: string }
export interface Brain {
  frame: { kind: 'normal' | 'follow' | 'vibrant' | 'transform' | 'two' | 'hidden'; name: string; zh: string };
  power: { score: number; key: 'weak' | 'balanced' | 'strong'; ru: string };
  yong: El; xi: El[]; ji: El[]; steps: Step[];
  /** Сила «на грани»: набор для противоположного перевеса — такт решает, какой работает (朱祖夏 八字与用神 гл.2 中和). */
  alt?: { lean: 'weak' | 'strong'; yong: El; xi: El[]; ji: El[] };
}

const SEASON_PTS = [3, 2, -1, -2, -3];  // 旺相休囚死
const DIRS: [number[], El][] = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]];
const TRINE: [number[], El][] = [[[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3], [[8, 0, 4], 4]];
const COMBO: [number, number, El][] = [[0, 5, 2], [1, 6, 3], [2, 7, 4], [3, 8, 0], [4, 9, 1]];
const VIBRANT = [['曲直', 'Прямое-кривое'], ['炎上', 'Пламя вверх'], ['稼穑', 'Посев и жатва'], ['从革', 'Следующий переменам'], ['润下', 'Влага вниз']];
const SIX_HE = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const uniq = (xs: El[]) => xs.filter((x, i) => xs.indexOf(x) === i);

export function brain(c: Chart, a: Analysis): Brain {
  const P = c.pillars, dm = a.dm, d = a.dmEl;
  const month = P.find((p) => p.pos === 'month')!;
  const res = ((d + 4) % 5) as El, out = ((d + 1) % 5) as El, wealth = ((d + 2) % 5) as El, officer = ((d + 3) % 5) as El;
  const vis = P.filter((p) => p.pos !== 'day');
  const steps: Step[] = [];

  // 1. Сила: сезон + корни (шкала ЦПЦЦ гл.6) + стволы + главные ци ветвей (кроме месяца — он уже в сезоне).
  const season = seasonState(d, BRANCHES[month.branch].el);
  const roots = P.reduce((s, p) => s + (rootOf(dm, p.branch)?.w ?? 0), 0);
  const elOf = (s: number) => STEMS[s].el;
  let friend = roots + (season === 0 ? 3 : 0), resSup = season === 1 ? 2 : 0, against = season >= 2 ? -SEASON_PTS[season] : 0;
  for (const p of vis) { const e = elOf(p.stem); if (e === d) friend += 1; else if (e === res) resSup += 1; else against += 1; }
  for (const p of P) if (p.pos !== 'month') { const e = elOf(BRANCHES[p.branch].hidden[0]); if (e === res) resSup += 1; else if (e !== d) against += 1; }
  // ponytail: линейная сумма баллов с порогами 3 / −1 — грубая шкала; уточнять по сверке карт.
  const score = friend + resSup - against;
  const key = score >= 3 ? 'strong' : score <= -1 ? 'weak' : 'balanced';
  const ru = STRENGTH_RU(score);
  steps.push({ title: 'Сила', src: 'ЦПЦЦ гл.3, гл.6; ДТС 衰旺; 命理约言 卷一 看日主法',
    text: `В сезон рождения стихия дня ${['в расцвете', 'крепнет', 'отдыхает', 'заперта', 'без сил'][season]}; ${roots >= 5 ? 'корни в ветвях крепкие' : roots ? 'корни в ветвях есть' : 'корней в ветвях нет'}; поддержки ${friend + resSup > against ? 'больше, чем давления' : friend + resSup < against ? 'меньше, чем давления' : 'столько же, сколько давления'} → ${ru}.` });

  const done = (frame: Brain['frame'], yong: El, xi: El[], ji: El[]): Brain => {
    const fav = uniq([yong, ...xi]);
    return { frame, power: { score, key, ru }, yong, xi: fav.slice(1, 3), ji: uniq(ji).filter((e) => !fav.includes(e)).slice(0, 2), steps };
  };

  // 2. Внешние структуры (命理约言 卷二 从局赋 / 化局赋 / 一行得气赋).
  const helpStems = vis.some((p) => elOf(p.stem) === d || elOf(p.stem) === res);
  // 五阳从气不从势，五阴从势无情义 (ДТС; 徐乐吾 评注 гл.1): инь-ствол следует и при одном лёгком корне.
  const rootCap = STEMS[dm].yang ? 0 : 1;
  if (roots <= rootCap && !helpStems && season >= 2) {
    const dom = [out, wealth, officer].sort((x, y) => a.scores[y] - a.scores[x])[0];
    if (a.scores[res] < a.scores[dom]) {
      const g = dom === out ? 'Выражение' : dom === wealth ? 'Богатство' : 'Власть';
      steps.push({ title: `Следование за ${g} (从格)`, src: '命理约言 卷二 从局赋; ДТС 从象',
        text: `${roots ? 'Корень один и лёгкий, ствол инь — «五阴从势无情义»' : 'Корней нет'}, поддержки в стволах нет — «日主无根…舍弱以从强». Полезно то, за чем следуем, и что его питает; вредны Печать и «свои»: «已弃之命，逢根即属不祥».` });
      return done({ kind: 'follow', name: `Следование за ${g}`, zh: '从格' }, dom, dom === wealth ? [out, officer] : [wealth], [res, d]);
    }
    steps.push({ title: 'Следования нет', src: '命理约言 卷二 从局赋', text: 'Корней нет, но Печати много — «印多则无从理»: остаёмся в обычной структуре.' });
  }
  const branches = P.map((p) => p.branch);
  const full = [...DIRS, ...TRINE].some(([set, e]) => e === d && set.every((b) => branches.includes(b)));
  const earthAll = d === 2 && branches.filter((b) => BRANCHES[b].el === 2).length >= 3;
  if (season === 0 && (full || earthAll) && !vis.some((p) => elOf(p.stem) === officer)) {
    const [zh, nm] = VIBRANT[d];
    steps.push({ title: `Одна стихия (${zh})`, src: '命理约言 卷二 一行得气赋; ДТС 一行得气',
      text: `Стихия дня в сезоне и собрана ветвями в сторону/союз — «一行得气». Полезны своя стихия, Печать и выход силы (食伤 «秀气流行»); вреден Чиновник/Убийство.` });
    // 07.10: ДТС 任注 в 一行得气 берёт 食伤 (泄秀) при наличии выхода силы в стволах/главных ци ветвей: 14 из 19 карт эталона.
    const hasOut = vis.some((p) => elOf(p.stem) === out) || branches.some((b) => BRANCHES[b].el === out);
    if (hasOut) steps.push({ title: 'Выход силы (泄秀)', src: '滴天髓 一行得气, 任铁樵注', text: 'Выход силы в карте есть — сила стихии «秀气流行» через него: он и полезен первым.' });
    return done({ kind: 'vibrant', name: nm, zh: `${zh}格` }, hasOut ? out : d, hasOut ? [d, res] : [out, res], [officer, wealth]);
  }
  for (const p of vis.filter((q) => q.pos === 'month' || q.pos === 'hour')) {
    const pair = COMBO.find(([x, y]) => (x === dm && y === p.stem) || (y === dm && x === p.stem));
    if (!pair) continue;
    const hua = pair[2], rival = vis.filter((q) => q.stem === p.stem).length > 1 || vis.some((q) => q.stem === dm);
    const breaker = vis.some((q) => elOf(q.stem) === (hua + 3) % 5);
    if (BRANCHES[month.branch].el === hua && !rival && !breaker) {
      steps.push({ title: `Превращение в ${EL[hua]} (化气)`, src: '命理约言 卷二 化局赋; ЦПЦЦ гл.5',
        text: `Господин в союзе с соседним стволом ${STEMS[p.stem].zh}, месяц — стихия союза, соперника и разрушителя нет: «先观月气，乃化神根本之乡». Полезны ${EL[hua]} и то, что её питает; вредно то, что её бьёт.` });
      return done({ kind: 'transform', name: `Превращение в ${EL[hua]}`, zh: '化气格' }, hua, [((hua + 4) % 5) as El], [((hua + 3) % 5) as El, d]);
    }
  }

  // Две стихии (两神成象): ровно две стихии, по два ствола и две ветви (главный ци) у каждой.
  const els = [...P.map((p) => elOf(p.stem)), ...P.map((p) => elOf(BRANCHES[p.branch].hidden[0]))];
  const kinds = [...new Set(els)] as El[];
  if (kinds.length === 2 && kinds.every((e) => P.filter((p) => elOf(p.stem) === e).length === 2 && P.filter((p) => elOf(BRANCHES[p.branch].hidden[0]) === e).length === 2)) {
    const [x, y] = kinds, born = (x + 1) % 5 === y || (y + 1) % 5 === x;
    const boss = (x + 2) % 5 === y ? x : y;  // кто бьёт (для пары удара)
    const ji = born ? [((x + 3) % 5) as El, ((y + 3) % 5) as El] : [((boss + 3) % 5) as El];
    steps.push({ title: `Две стихии (两神成象): ${EL[x]} и ${EL[y]}`, src: '命理约言 卷一 看两神成象法, 卷二 两神成象赋',
      text: `Карта из двух стихий поровну — «${born ? '相生' : '相成'}». Полезны обе; вредно то, что вмешивается${born ? ' и бьёт любую из них' : ', — то, что бьёт сильную сторону'}: «一路澄清，必位高而禄厚；中途混乱，恐职夺而家倾».` });
    return done({ kind: 'two', name: `Две стихии: ${EL[x]} и ${EL[y]}`, zh: '两神成象格' }, x, [y], ji);
  }
  // 暗冲/暗合: ветвь дня повторена 3–4 раза, Чиновника нет — он «вызывается» ударом или союзом.
  const dayP = P.find((p) => p.pos === 'day')!, dayName = STEMS[dayP.stem].zh + BRANCHES[dayP.branch].zh;
  const HID: Record<string, [string, number]> = { 丙午: ['冲', 0], 丁巳: ['冲', 11], 庚子: ['冲', 6], 壬子: ['冲', 6], 辛亥: ['冲', 5], 癸亥: ['冲', 5],
    甲辰: ['合', 9], 戊戌: ['合', 3], 癸卯: ['合', 10], 癸酉: ['合', 4] };
  const hd = HID[dayName];
  const officerAnywhere = P.some((p) => elOf(p.stem) === officer || BRANCHES[p.branch].hidden.some((h) => elOf(h) === officer && godOf(dm, h).key === 'ZG'));
  if (hd && branches.filter((x) => x === dayP.branch).length >= 3 && !branches.includes(hd[1]) && !officerAnywhere) {
    steps.push({ title: `Скрытый ${hd[0] === '冲' ? 'удар' : 'союз'} (暗${hd[0]}格)`, src: '命理约言 卷一 看暗冲法/看暗合法, 卷二 暗冲暗合赋',
      text: `Ветвь дня ${BRANCHES[dayP.branch].zh} повторена ${branches.filter((x) => x === dayP.branch).length} раза, Чиновника нет — он «вызывается» из ${BRANCHES[hd[1]].zh}. Полезны Чиновник «в пустоте» и Богатство; вредно «填实»: сам знак ${BRANCHES[hd[1]].zh} или Чиновник в такте и годе.` });
    return done({ kind: 'hidden', name: `Скрытый ${hd[0] === '冲' ? 'удар' : 'союз'}`, zh: `暗${hd[0]}格` }, wealth, [d], [officer, out]);
  }

  // 3. Обычная структура: бог ветви месяца, проступивший в стволах (ЦПЦЦ гл.8, гл.10).
  const st = stageOf(dm, month.branch);
  const hid = BRANCHES[month.branch].hidden, vs = vis.map((p) => p.stem);
  const axis = hid.find((h) => vs.includes(h) && elOf(h) !== d) ?? hid[0];
  const g = st === 3 ? { zh: '建禄', ru: 'Опора месяца' } : st === 4 && STEMS[dm].yang ? { zh: '月刃', ru: 'Клинок месяца' } : GODS[godOf(dm, axis).key];
  const frame = { kind: 'normal' as const, name: g.ru, zh: `${g.zh}格` };
  steps.push({ title: `Структура: ${g.ru} (${g.zh}格)`, src: 'ЦПЦЦ гл.8, гл.10; 命理约言 卷一 看格局法',
    text: elOf(axis) === d ? 'Месяц — своя стихия: структуру дают Чиновник, Богатство или Выражение в стволах («禄刃…用官煞财食»).' : `Бог ветви месяца ${vs.includes(axis) ? 'проступил — структура явная' : 'не проступил — структура по главной ци, слабее'}.` });

  // 4. 扶抑 — что именно давит / что именно усиливает (ДТС 衰旺; 命理约言 比劫赋).
  const pick = (lean: 'weak' | 'strong'): [El, El[], El[], string] => {
  if (lean === 'strong') {
    // 真神得用 (ДТС 真神): из трёх «ослабителей» берётся проступивший в стволах и самый сильный.
    // Сверка с мастерами (bench/gold.json, 302 карты): 用神 совпадает в 43% против 29% у прежнего правила.
    const drains = [out, wealth, officer], shown = drains.filter((e) => vis.some((p) => elOf(p.stem) === e));
    const y = [...(shown.length ? shown : drains)].sort((x, z) => a.scores[z] - a.scores[x])[0];
    if (y === out) return [out, [wealth], [res, d], 'силу выпускать через Выражение — оно проступило и сильнее прочих: «旺者宜泄» (ДТС «真神得用»)'];
    if (y === wealth) return [wealth, [out, officer], [res, d], 'силу забирает Богатство — оно проступило и сильнее прочих; при сильной Печати это и лекарство «印多逢财» (ДТС «真神得用»)'];
    return [officer, [wealth], [d, res], 'силу сдерживает Власть — она проступила и сильнее прочих: «惟有正官偏官，可除其孽» (命理约言 比劫赋)'];
  }
    const top = [wealth, officer, out].sort((x, y) => a.scores[y] - a.scores[x])[0];
    if (top === wealth) return [d, [res], [wealth, out], 'давит Богатство — «свои», а не Печать (Печать Богатство разобьёт): ДТС 衰旺'];
    if (top === officer) return [res, [d], [officer, wealth], 'давит Чиновник/Убийство — Печать переводит давление в поддержку: «煞重用印»'];
    return [res, [d], [out, wealth], 'силы уходят в Выражение — Печать обуздывает его и питает господина'];
  };
  const lean = key === 'balanced' ? (score >= 1 ? 'strong' : 'weak') : key;
  let [yong, xi, ji, why] = pick(lean);
  // 煞重用印 / 官印相生 (ЦПЦЦ 论偏官 «煞重身轻…用印»; ДТС «杀旺用印»): Власть ≥ 20% и сильнейшая из давящих, проступили и она, и Печать —
  // Печать переводит давление в поддержку, даже если день не слаб. Отвергнуто 06.10 как подгонка (+5 на 195), подтверждено 07.10
  // на 209 новых картах 任铁樵 без перенастройки: +5/−1, обе половины.
  if (score >= -1 && yong !== res && a.pct[officer] >= 0.2 && a.pct[officer] >= a.pct[out] && a.pct[officer] >= a.pct[wealth]
    && vis.some((p) => elOf(p.stem) === officer) && vis.some((p) => elOf(p.stem) === res)) {
    [yong, xi, ji, why] = [res, [d], [wealth, officer], 'давит Власть, и Печать рядом в стволах — она переводит давление в поддержку: «煞重用印», «官印相生»'];
  }
  steps.push({ title: 'Поддержать или ослабить (扶抑)', src: 'ДТС 衰旺; ЦПЦЦ гл.6; 命理约言 卷一 看用神法',
    text: `${key === 'balanced' ? 'Сила на грани — вывод слабее обычного. ' : ''}${why[0].toUpperCase()}${why.slice(1)}. Полезный бог — ${EL[yong]}.` });

  // 5. 调候: зимой без Огня и летом без Воды климат важнее баланса.
  const winter = [11, 0, 1].includes(month.branch), summer = [5, 6, 7].includes(month.branch);
  const need: number = winter ? 1 : summer ? 4 : -1;
  // Тепло зимой и влага летом во вред не записываются никогда (ЦТБЦ: зимой 丙丁, летом 壬癸 — у всех стволов).
  if (need >= 0) ji = ji.filter((e) => e !== need);
  // Климат — первый помощник (喜), но не 用神: «先保身，然后才能再谈调候» (朱祖夏 八字与用神 гл.2).
  // Сверка bench/gold.json: в 38 холодных/жарких картах без нужной стихии мастера берут её в 用神 лишь 5 раз.
  if (need >= 0 && yong !== need) {
    xi = [need as El, ...xi.filter((e) => e !== need)];
    steps.push({ title: `Климат: ${winter ? 'холодно' : 'жарко'} (调候)`, src: '穷通宝鉴; 命理约言 卷四 «寒则喜温…炎则喜润»; 朱祖夏 八字与用神 гл.2',
      text: `${winter ? 'Зимняя' : 'Летняя'} карта (${EL[need]} ${Math.round(a.pct[need] * 100)}%): ${EL[need]} — первый помощник, полезный бог остаётся по силе («先保身，然后才能再谈调候»). Для равновесия нужны: ${[...new Set([...TIAOHOU[dm][month.branch]].map((z) => EL[STEMS['甲乙丙丁戊己庚辛壬癸'.indexOf(z)].el].toLowerCase()))].join(', ')}.` });
  }

  // 6. 通关: две враждующие сильные стихии — нужен посредник.
  for (let x = 0; x < 5; x++) {
    const y = (x + 2) % 5, m = ((x + 1) % 5) as El;
    if (a.pct[x] >= 0.3 && a.pct[y] >= 0.3 && !ji.includes(m) && m !== yong) {
      xi = [m, ...xi];
      steps.push({ title: `Посредник: ${EL[m]} (通关)`, src: 'ДТС 通关', text: `${EL[x]} и ${EL[y]} обе сильны и воюют — ${EL[m]} переводит удар в рождение.` });
    }
  }
  // 7. 病药: стихия в избытке (≥40%) — болезнь; то, что её сдерживает, — лекарство.
  const ill = a.pct.findIndex((p) => p >= 0.4);
  if (ill >= 0 && ji.includes(ill as El)) {
    const med = ((ill + 3) % 5) as El;
    steps.push({ title: `Болезнь и лекарство (病药)`, src: '神峰通考 病药说',
      text: `${EL[ill]} в избытке (${Math.round(a.pct[ill] * 100)}%) — это «болезнь»; ${EL[med]} её сдерживает${ji.includes(med) ? ', но для этой карты вредна — лекарство только через полезного бога' : ' — «лекарство»'}.` });
    if (!ji.includes(med)) xi = [...xi, med];
  }
  const b = done(frame, yong, xi, ji);
  // 中和: при силе «на грани» 用神 по наталу не окончательный — такт ломает баланс (朱祖夏 八字与用神 гл.2 §3).
  if (key === 'balanced') {
    const other = lean === 'strong' ? 'weak' : 'strong';
    let [y2, x2, j2] = pick(other);
    if (need >= 0) { j2 = j2.filter((e) => e !== need); if (y2 !== need) x2 = [need as El, ...x2.filter((e) => e !== need)]; }
    const fav = uniq([y2, ...x2]);
    b.alt = { lean: other, yong: y2, xi: fav.slice(1, 3), ji: uniq(j2).filter((e) => !fav.includes(e)).slice(0, 2) };
    steps.push({ title: 'Баланс решает такт (中和)', src: '朱祖夏 八字与用神 гл.2 §3',
      text: `Сила на грани: в тактах, где ${other === 'strong' ? 'приходят «свои» и Печать' : 'приходит давление (Богатство, Власть, Выражение)'}, полезным становится ${EL[y2]}, а не ${EL[yong]}.` });
  }
  return b;
}

/** Такт или год целиком: ствол и ветвь вместе, «上下俱喜则十年全吉…一喜一忌则吉凶参半»; кто кого бьёт, тот весит больше
 *  («上克下者，上之力胜于下») — 命理约言 卷一 看运法, 卷二 行运赋. */
/** Набор 用/喜/忌, действующий в периоде idx: при силе «на грани» такт ломает баланс (朱祖夏 八字与用神 гл.2 中和). */
export function activeSet(b: Brain, idx: number, c?: Chart): { set: Pick<Brain, 'yong' | 'xi' | 'ji'>; swung: boolean } {
  if (!b.alt || !c) return { set: b, swung: false };
  const d = STEMS[c.pillars.find((p) => p.pos === 'day')!.stem].el, up = (e: El) => (e === d || e === (d + 4) % 5 ? 1 : -1);
  const tip = up(STEMS[idx % 10].el) + up(BRANCHES[idx % 12].el);
  return (tip > 0 ? 'strong' : tip < 0 ? 'weak' : '') === b.alt.lean ? { set: b.alt, swung: true } : { set: b, swung: false };
}

/** 天克地冲: ствол бьёт ствол и ветвь бьёт ветвь одновременно (甲庚 乙辛 丙壬 丁癸 + 子午…). */
export const tianKeDiChong = (x: number, y: number) => Math.abs((x % 10) - (y % 10)) === 6 && Math.min(x % 10, y % 10) < 4 && Math.abs((x % 12) - (y % 12)) === 6;

export function periodVerdict(b: Brain, idx: number, c?: Chart, partner?: number): { tone: 'good' | 'bad' | 'mixed' | 'calm'; text: string; set: Pick<Brain, 'yong' | 'xi' | 'ji'>; se: El; swung: boolean } {
  let se: El = STEMS[idx % 10].el;
  const be = BRANCHES[idx % 12].el;
  // Сила на грани: ствол и ветвь периода оба «свои/Печать» или оба против — перевес меняется, берём другой набор.
  const { set, swung } = activeSet(b, idx, c);
  const swing = swung && b.alt ? ` Сила на грани, период её ${b.alt.lean === 'strong' ? 'поднимает' : 'опускает'} — здесь полезнее ${EL[b.alt.yong].toLowerCase()} (朱祖夏 中和)` : '';
  const v = (e: El) => (e === set.yong ? 2 : set.xi.includes(e) ? 1 : set.ji.includes(e) ? -1.5 : 0);
  // Союз ствола периода со стволом натала (命理约言 干合论; ЦПЦЦ гл.5): связанный ствол «贪合» — работает вполсилы;
  // если ветвь месяца карты — стихия союза, он превращается (丙辛 зимой → Вода; ДТС «丙辛生於冬月»).
  let bond = '', k = 1;
  if (c) {
    const st = idx % 10, month = c.pillars.find((p) => p.pos === 'month')!;
    const order = [...c.pillars].sort((x, y) => (y.pos === 'day' ? 1 : 0) - (x.pos === 'day' ? 1 : 0));
    for (const p of order) {
      const pair = COMBO.find(([x, y]) => (x === st && y === p.stem) || (y === st && x === p.stem));
      if (!pair) continue;
      if (p.pos === 'day') { bond = ' Период в союзе с вами — сам по себе не вред'; break; }
      // На собственном сильном корне (禄/刃/长生) ствол не превращается, только связан (ЦПЦЦ гл.5 «合而不化»).
      if (BRANCHES[month.branch].el === pair[2] && (rootOf(st, idx % 12)?.w ?? 0) < 3) { se = pair[2]; bond = ` ${STEMS[st].ru} в союзе с ${STEMS[p.stem].ru} вашей карты и превращается: работает как ${EL[pair[2]]}`; }
      else { k = 0.5; bond = ' Часть силы периода уходит в союз с вашей картой — действует вполсилы'; }
      break;
    }
  }
  let s = v(se) * k, r = v(be);
  if ((se + 2) % 5 === be) s *= 1.5; else if ((be + 2) % 5 === se) r *= 1.5;
  let extra = '', s0 = s, r0 = r;
  if (c) {
    const day = c.pillars.find((p) => p.pos === 'day')!, month = c.pillars.find((p) => p.pos === 'month')!;
    // 空亡 (命理约言 空亡论): пустая ветвь, которая есть в карте, период «заполняет» — «至运逢原空之神，是为填实，不为愈空»;
    // если в карте её нет — тоже пустота, но слабее, чем в самой карте («苟原无而运遇之，亦以空论，然不如局遇之紧»).
    // В карте: вне сезона (失时) −7/10, в сезоне (得时) −3/10 — для периода берём половину.
    if (voidOf(day.idx).includes(idx % 12)) {
      if (c.pillars.some((p) => p.branch === idx % 12)) extra += ' Ветвь периода «заполняет» пустую ветвь вашей карты (填实) — её тема оживает (命理约言 空亡论)';
      else {
        const half = seasonState(be, BRANCHES[month.branch].el) <= 1;
        r *= half ? 0.85 : 0.65; r0 = r;
        extra += ` Ветвь периода «в пустоте» — действует слабее (命理约言 空亡论)`;
      }
    }
    // 天克地冲 со столпом дня — «间有不利» (命理约言 太岁论); снимается союзом с соседним периодом (朱祖夏 гл.8).
    if (tianKeDiChong(idx, day.idx)) {
      const freed = partner !== undefined && (Math.abs((partner % 10) - (idx % 10)) === 5 || SIX_HE.some(([x, y]) => (x === partner % 12 && y === idx % 12) || (y === partner % 12 && x === idx % 12)));
      if (freed) extra += ' Двойной удар по столпу дня снят союзом такта и года (朱祖夏 八字与用神 гл.8)';
      else { s -= 0.75; r -= 0.75; extra += ' Двойной удар по столпу дня (天克地冲): перемены в доме, паре, здоровье — «间有不利» (命理约言 太岁论)'; }
    }
  }
  // Текст — по стихиям периода (до штрафа за 天克地冲), тон — с ним: иначе «одна стихия — нагрузка» при нейтральной стихии.
  const t = s + r, byEl = verdictOf(s0, r0, s0 + r0), fin = verdictOf(s, r, t);
  const res0 = { tone: fin.tone, text: byEl.text + (fin.tone !== byEl.tone ? ', но удар по столпу дня перевешивает' : '') };
  return { tone: res0.tone, text: res0.text + (bond ? '.' + bond : '') + (swing ? '.' + swing : '') + (extra ? '.' + extra : ''), set, se, swung };
}

function verdictOf(s: number, r: number, t: number): { tone: 'good' | 'bad' | 'mixed' | 'calm'; text: string } {
  if (s > 0 && r > 0) return { tone: 'good', text: 'обе стихии периода вам полезны — он хорош целиком' };
  if (s < 0 && r < 0) return { tone: 'bad', text: 'обе стихии периода — нагрузка, он тяжёлый целиком' };
  if (s * r < 0) return { tone: t > 0 ? 'good' : t < 0 ? 'bad' : 'mixed', text: `одна стихия полезна, другая — нагрузка; перевешивает ${(Math.abs(s) > Math.abs(r)) === (s > 0) ? 'польза' : 'нагрузка'}` };
  return { tone: t > 0 ? 'good' : t < 0 ? 'bad' : 'calm', text: t > 0 ? 'полезное без вредного — умеренно хорошо' : t < 0 ? 'вредное без полезного — умеренно тяжело' : 'ни заметной помощи, ни нагрузки' };
}
