// Подробный разбор по базе знаний проекта (KB 02–05, 09, 10 в ~/projects/бацзы): каждый вывод — из фактов карты,
// с цитатой и источником. Сокращения: ДТС — 滴天髓 (Жэнь Тецяо), ЦПЦЦ — 子平真诠, ЮХ — 渊海子平, СМ — 三命通会,
// ЦТБЦ — 穷通宝鉴. Расчёт силы/полезных стихий — в calc.ts; здесь только толкование.
import { STEMS, BRANCHES, EL, EL_GEN, GODS, SEASON_STATE, godOf, stageOf, seasonState } from './core';
import type { Analysis, Chart, Pos } from './calc';
import { describe } from './describe';

export interface Note { title: string; text: string; quote?: string; src?: string; tone?: 'good' | 'bad' | 'mixed' }

// Десять стихов ДТС (天干论) — правило поведения ствола; перевод свой.
export const STEM_VERSE: { zh: string; ru: string }[] = [
  { zh: '甲木参天，脱胎要火。春不容金，秋不容土', ru: 'Дерево Цзя тянется к небу; чтобы раскрыться, ему нужен Огонь. Весной не терпит Металла, осенью — Земли.' },
  { zh: '乙木虽柔，刲羊解牛…藤萝系甲，可春可秋', ru: 'И мягко, но одолевает и сухую, и сырую Землю; обвив ствол Цзя, живёт в любой сезон.' },
  { zh: '丙火猛烈，欺霜侮雪。能煅庚金，逢辛反怯', ru: 'Бин яростен, презирает иней и снег; плавит твёрдый металл, но перед мягким Синь робеет.' },
  { zh: '丁火柔中，内性昭融…如有嫡母，可秋可冬', ru: 'Дин мягок и собран, внутри ясный свет; если есть «родная мать» — Дерево, выстоит и осенью, и зимой.' },
  { zh: '戊土固重，既中且正…若在艮坤，怕冲宜静', ru: 'У тяжёл и прочен, срединный и прямой; на Тигре или Обезьяне боится ударов — ему нужен покой.' },
  { zh: '己土卑湿，中正蓄藏。不愁木盛，不畏水狂', ru: 'Цзи — низинная влажная почва, хранит и копит; не боится ни буйства Дерева, ни разлива Воды.' },
  { zh: '庚金带煞，刚健为最。得水而清，得火而锐', ru: 'Гэн суров, твёрже всех; с Водой становится чистым, с Огнём — острым.' },
  { zh: '辛金软弱，温润而清。畏土之叠，乐水之盈', ru: 'Синь мягок, тёпл и чист; боится завала Землёй, радуется полноводью.' },
  { zh: '壬水通河，能泄金气…周流不滞', ru: 'Жэнь — большая река: выпускает силу Металла и течёт по кругу, не застаиваясь.' },
  { zh: '癸水至弱，达于天津。得龙而运', ru: 'Гуй слабее всех, но доходит до небесной переправы; с Драконом приходит в движение.' },
];
// Пять постоянств по стихиям (ЮХ 论性情; СМ т.1, т.7).
const VIRTUE = ['человечность 仁', 'учтивость 礼', 'верность слову 信', 'справедливость 义', 'мудрость 智'];

// Климат 穷通宝鉴: [ствол дня][ветвь месяца 子…亥] → стволы в порядке приоритета (KB 09, таблица 10×12).
export const TIAOHOU: string[][] = [
  ['丁庚丙', '庚丁', '丙癸', '庚戊丁丙', '庚壬', '癸丁庚', '癸丁庚', '丁庚', '丁庚', '丁丙庚', '丁壬癸庚', '庚丁丙戊'],
  ['丙', '', '丙癸', '丙癸', '癸丙', '癸辛庚', '癸丙', '癸丙', '丙癸己', '癸丙', '癸辛', '丙戊'],
  ['壬戊己', '壬甲', '壬庚', '壬己', '壬甲', '壬庚癸', '壬庚', '壬庚', '壬戊', '壬癸', '甲壬癸', '甲戊庚壬'],
  ['甲庚', '甲庚', '庚甲', '庚甲', '甲庚', '甲庚壬', '壬庚癸', '甲壬庚', '甲庚丙', '甲庚丙', '甲庚', '甲庚'],
  ['丙甲', '丙甲', '丙甲癸', '丙甲癸', '甲丙癸', '甲丙癸', '壬甲丙', '癸丙甲', '丙癸甲', '丙癸', '甲癸丙', '甲丙'],
  ['丙甲', '丙甲', '丙庚甲', '甲癸丙', '丙癸甲', '癸丙辛', '癸丙', '癸丙', '癸丙辛', '癸丙辛', '甲癸丙', '丙甲戊'],
  ['丁甲丙', '丙丁甲', '丙甲丁', '丁甲庚丙', '甲丁', '壬戊丙丁', '壬癸', '丁甲', '丁甲', '丁甲丙', '甲壬', '丁丙甲'],
  ['丙壬戊甲', '丙壬戊己', '己壬庚', '壬甲', '壬甲', '壬甲癸', '壬己癸', '壬庚甲', '壬甲戊', '壬甲', '壬甲', '壬丙'],
  ['戊丙', '丙丁甲', '庚丙戊', '戊辛庚', '甲庚', '壬辛庚癸', '癸庚辛', '辛甲癸', '戊丁', '甲庚', '甲丙', '戊丙庚'],
  ['丙辛', '丙丁', '辛丙庚', '庚辛', '丙辛甲', '辛庚壬', '庚辛壬癸', '庚辛壬癸', '丁甲', '辛丙', '辛甲壬癸', '庚辛戊丁'],
];
const SZ = '甲乙丙丁戊己庚辛壬癸';

// Что поддерживает/обуздывает бога (ЦПЦЦ гл.8) и его нрав (ЮХ 相心赋, 论十神; СМ т.5).
const GOD_KB: Record<string, { care: string; careZh: string; nature: string; natureSrc: string }> = {
  ZG: { care: 'Чиновнику нужны проступившие Богатство (питает) и Печать (защищает); боится Ранящего и смеси с Убийством', careZh: '官喜透財以相生，生印以護官', nature: 'доброжелательность, широта, порядок — «愷悌…仁慈寬大»', natureSrc: 'ЮХ, 相心赋' },
  QS: { care: 'Убийство обуздывают Богом еды; Богатство и Печать его подкармливают', careZh: '七煞喜食神以制伏，忌財印以資扶', nature: 'нрав тигра, порывистость — «情性如虎、急躁如风»; укрощённое даёт власть', natureSrc: 'ЮХ, 相心赋' },
  ZC: { care: 'Богатству нужна сила хозяина и корень; лучше спрятанное, чем выставленное', careZh: '財喜根深，不宜太露', nature: 'честность и бережливость, на грани скупости — «誠實…儉約…惟有慳吝»', natureSrc: 'СМ т.5' },
  PC: { care: 'Богатству нужна сила хозяина и корень; лучше спрятанное, чем выставленное', careZh: '財喜根深，不宜太露', nature: 'щедрость и риск — «慷慨…多詐»', natureSrc: 'СМ т.5' },
  ZY: { care: 'Печать питают Чиновник/Убийство, защищают «друзья» от Богатства', careZh: '印喜官煞以相生，劫才以護印', nature: 'ум и мягкость — «多智慧、丰身自在心慈»', natureSrc: 'ЮХ, 相心赋' },
  PY: { care: 'Косвенный ресурс выправляет Богатство; его главный вред — Богу еды', careZh: '食神最忌', nature: 'горячий старт, холодный финиш — «始勤终惰、好学艺而多学少成»', natureSrc: 'ЮХ, 相心赋' },
  SS: { care: 'Богу еды нужна сила хозяина, а сам он рождает Богатство; один хорош, много — как Ранящий', careZh: '食喜身旺以相生，生財以護食', nature: 'вкус к жизни и щедрость — «善能飲食、體厚而喜謳歌»', natureSrc: 'ЮХ, 相心赋' },
  SG: { care: 'Ранящего обуздывает Печать или «перерабатывает» Богатство', careZh: '傷官喜佩印以制伏，生財以化傷', nature: 'много талантов и высокомерие — «多才艺、傲物气高»; чистый мягок, мутный резок', natureSrc: 'ЮХ, 论十神; ДТС 性情' },
  JC: { care: 'Соперника обуздывает Чиновник или переводит в Богатство Бог еды', careZh: '月劫喜透官以制伏，利用財而透食以化劫', nature: 'траты и соперники — «主破耗、防小人»', natureSrc: 'ЮХ, 论十神' },
  BJ: { care: 'Месяц — собственная стихия: опора есть, ось ищут в стволах', careZh: '月令无物可取，只是身强', nature: 'равные, братья, самостоятельность — «比肩爲兄弟»', natureSrc: 'ЦПЦЦ гл.23' },
};

const pillars = (c: Chart) => c.pillars;
const visible = (c: Chart) => pillars(c).filter((p) => p.pos !== 'day');
const P_RU: Record<Pos, string> = { year: 'года', month: 'месяца', day: 'дня', hour: 'часа' };

/** Корень господина в ветви — по шкале ЦПЦЦ гл.3, гл.6. */
export function rootOf(dm: number, b: number): { kind: string; w: number } | null {
  const st = stageOf(dm, b), yang = STEMS[dm].yang;
  if (st === 3) return { kind: '禄 — собственная «служба», сильный корень', w: 3 };
  if (st === 4) return { kind: yang ? '刃 — Клинок, сильный корень' : '帝旺 — расцвет, сильный корень', w: 3 };
  if (st === 0) return yang ? { kind: '长生 — «рождение», сильный корень', w: 3 } : { kind: 'инь-长生 — слабый, как остаточный', w: 1 };
  if (st === 8) return yang ? { kind: 'хранилище своей стихии — средний корень', w: 2 } : null;
  if (BRANCHES[b].hidden.some((h) => STEMS[h].el === STEMS[dm].el)) return { kind: 'остаточная ци — слабый корень', w: 1 };
  return null;
}

/** Природа: стих ДТС, постоянство стихии. */
export function natureNote(a: Analysis): Note {
  const v = STEM_VERSE[a.dm];
  return { title: 'Природа', text: `${v.ru} Стихия ${EL_GEN[a.dmEl]} отвечает за ${VIRTUE[a.dmEl]}.`, quote: v.zh, src: 'ДТС, 天干论; ЮХ, 论性情' };
}

/** Сила: сезон (旺相休囚死) + корни + что давит и что поэтому нужно (ДТС 衰旺). */
export function strengthNote(c: Chart, a: Analysis): Note {
  const month = pillars(c).find((p) => p.pos === 'month')!;
  const ss = seasonState(a.dmEl, BRANCHES[month.branch].el);
  const roots = pillars(c).map((p) => ({ p, r: rootOf(a.dm, p.branch) })).filter((x) => x.r);
  const friends = visible(c).filter((p) => STEMS[p.stem].el === a.dmEl).length;
  const rootTxt = roots.length
    ? roots.map(({ p, r }) => `${BRANCHES[p.branch].animal} ${P_RU[p.pos]} (${r!.kind})`).join('; ')
    : 'корней в ветвях нет';
  const wealth = a.scores[(a.dmEl + 2) % 5], officer = a.scores[(a.dmEl + 3) % 5], out = a.scores[(a.dmEl + 1) % 5];
  let need: string;
  if (a.ratio < 0.5) {
    const top = Math.max(wealth, officer, out);
    need = top === wealth ? 'давит Богатство — по Жэню нужны «друзья» (своя стихия), а не Печать: Печать Богатство разобьёт'
      : top === officer ? 'давит Чиновник/Убийство — нужна Печать: она переводит давление в поддержку'
        : 'силы уходят в выражение — нужна Печать, чтобы было чем отдавать';
  } else {
    need = wealth + officer < out ? 'сильны «свои», а Богатства и Чиновника мало — лучше выпускать силу через Бога еды/Ранящего (дело, продукт)'
      : 'сила есть, и есть кому её принять — годятся Чиновник (дисциплина) и Богатство (дело)';
  }
  return {
    title: `Сила: ${a.strength}`,
    text: `Сезон рождения: ${EL[a.dmEl]} — «${SEASON_STATE[ss].toLowerCase()}». Корни: ${rootTxt}. Стволов своей стихии рядом: ${friends}. `
      + `Корень весит больше сезона и стволов. Вывод: ${need}.`,
    quote: '干多不如根重', src: 'СМ т.2 (旺相休囚死); ЦПЦЦ гл.3, гл.6; ДТС 衰旺',
    tone: a.ratio < 0.35 || a.ratio > 0.75 ? 'mixed' : 'good',
  };
}

/** Ось карты — бог ветви месяца; правит проступивший ствол (ЦПЦЦ гл.8, гл.10). */
export function axisNote(c: Chart, a: Analysis): Note & { godKey: string } {
  const month = pillars(c).find((p) => p.pos === 'month')!;
  const vis = visible(c).map((p) => p.stem);
  const hid = BRANCHES[month.branch].hidden;
  const outOf = hid.filter((h) => vis.includes(h) && STEMS[h].el !== a.dmEl);
  const s = outOf[0] ?? hid[0], g = godOf(a.dm, s), kb = GOD_KB[g.key];
  const shown = vis.includes(s);
  const head = STEMS[s].el === a.dmEl
    ? `Месяц ${BRANCHES[month.branch].animal} — ваша собственная стихия: «${g.ru}». Своего бога месяц не даёт, структуру берут из стволов.`
    : `Ось карты — ветвь месяца ${BRANCHES[month.branch].animal}, её бог «${g.ru}» (${g.zh}) ${shown ? 'на виду — тема явная, работает в полную силу' : 'скрыт — тема проявляется в годы и такты, когда эта сила приходит'}.`;
  return { title: 'Ось карты (月令)', text: `${head} ${kb.care}.`, quote: kb.careZh, src: 'ЦПЦЦ гл.8, гл.10; ЮХ «欲知贵贱，先观月令»', godKey: g.key };
}

/** Климат по 穷通宝鉴: нужные стволы — проступили / спрятаны / нет. */
export function climateNote(c: Chart, a: Analysis): Note {
  const month = pillars(c).find((p) => p.pos === 'month')!;
  const need = [...TIAOHOU[a.dm][month.branch]].map((z) => SZ.indexOf(z));
  if (!need.length) return { title: 'Климат', text: `Для ${STEMS[a.dm].ru} в месяц ${BRANCHES[month.branch].animal} в доступной редакции книги клетки нет — климат не оцениваем.`, src: '穷通宝鉴' };
  const vis = visible(c).map((p) => p.stem);
  const hid = pillars(c).flatMap((p) => BRANCHES[p.branch].hidden);
  const st = (s: number) => (vis.includes(s) ? 'проступил' : hid.includes(s) ? 'спрятан' : 'нет');
  const list = need.map((s) => `${STEMS[s].ru} (${EL[STEMS[s].el].toLowerCase()}) — ${st(s) === 'проступил' ? 'есть на виду' : st(s) === 'спрятан' ? 'спрятан' : 'нет'}`).join(', ');
  const top = need.slice(0, 2).map(st);
  const level = top.every((x) => x === 'проступил') ? 'сильная поддержка'
    : top.includes('проступил') && !top.includes('нет') ? 'средняя'
      : top.every((x) => x === 'спрятан') ? 'скромная: помогают годы, когда эти стихии приходят'
        : top.includes('проступил') ? 'средняя' : top.includes('спрятан') ? 'слабая: нужное есть лишь внутри ветвей' : 'слабая: нужное приходит только извне — тактами и годами';
  return {
    title: 'Климат',
    text: `Чтобы карте было «по погоде» (не слишком холодно или жарко), ей нужны: ${list}. Поддержка климата — ${level}. Это совет, а не приговор.`,
    quote: '寒雖甚，要暖有氣；暖雖至，要寒有根', src: '穷通宝鉴 (таблица); ДТС 寒暖',
    tone: level.startsWith('сильная') ? 'good' : level.startsWith('слабая') ? 'bad' : 'mixed',
  };
}

/** Классические формулы сочетаний богов (KB 05 §4) — по проступившим стволам. */
export function comboNotes(c: Chart, a: Analysis): Note[] {
  const V = new Set(visible(c).map((p) => godOf(a.dm, p.stem).key));
  const has = (...k: string[]) => k.some((x) => V.has(x));
  const grp = (g: string) => Object.entries(a.gods).filter(([k]) => GODS[k].group === g).reduce((s, [, w]) => s + w, 0);
  const tot = Object.values(a.gods).reduce((s, w) => s + w, 0) || 1;
  const month = pillars(c).find((p) => p.pos === 'month')!;
  const out: Note[] = [];
  if (has('SG') && has('ZG')) {
    const winterMetal = a.dmEl === 3 && [11, 0, 1].includes(month.branch);
    out.push({ title: 'Ранящий видит Чиновника', quote: winterMetal ? '金水見之，反爲秀氣' : '伤官见官，为祸百端', src: winterMetal ? 'ЦПЦЦ гл.14' : 'ЮХ, 论十神; СМ т.5',
      text: winterMetal ? 'Обычно — конфликт таланта с правилами, но у Металла зимой Чиновник-Огонь греет: сочетание становится изяществом.' : 'Талант и правила бьют друг друга: споры с начальством, законом, репутацией. Лекарство — Печать (учёба, документы) или Богатство между ними.', tone: winterMetal ? 'good' : 'bad' });
  }
  if (has('PY') && has('SS')) out.push({ title: 'Сова отнимает еду', quote: '食神逢梟', src: 'ЮХ; СМ т.5', tone: has('PC', 'ZC') ? 'mixed' : 'bad',
    text: `Нестандартное знание глушит естественный талант и доход от него.${has('PC', 'ZC') ? ' Богатство в стволах обуздывает Сову — по СМ т.5 «не судить сразу как беду».' : ' Выправляет Богатство — смотреть такты с ним.'}` });
  if (grp('Богатство') / tot > 0.35 && a.ratio < 0.5) out.push({ title: 'Богатства много, хозяин слаб', quote: '财多身弱，正为富屋贫人', src: 'ЮХ; СМ т.5; ДТС 衰旺', tone: 'bad',
    text: 'Возможностей больше, чем сил их удержать — «богатый дом, бедный хозяин». Помогают партнёры и своя опора (такты своей стихии), а не новая учёба.' });
  if (has('SS') && has('QS')) out.push({ title: 'Бог еды обуздывает Убийство', quote: '身强七煞逢制', src: 'ЦПЦЦ гл.8–9; СМ т.11', tone: a.ratio >= 0.4 ? 'good' : 'mixed',
    text: `Давление превращается в достижение через мастерство.${a.ratio >= 0.4 ? ' Сила хозяина позволяет — это одна из сильнейших формул.' : ' Но хозяин слаб: «煞重身輕終身有損» — нужна опора.'}` });
  if (has('ZG', 'QS') && has('ZY', 'PY')) out.push({ title: 'Чиновник и Печать питают друг друга', quote: '官印雙全', src: 'ЦПЦЦ гл.9; ЮХ «有官无印，即非真官»', tone: 'good',
    text: 'Статус рождает покровительство и знание, знание держит статус: карьера через систему, образование, документы.' });
  if (has('ZG') && has('QS')) out.push({ title: 'Чиновник и Убийство вперемешку', quote: '取清則貴', src: 'ЦПЦЦ, 正官格/七煞格; СМ т.5', tone: 'mixed',
    text: 'Два начальника — порядок и давление тянут в разные стороны. Ценность приходит, когда одного убирает Бог еды/Ранящий или союз.' });
  if (has('PC', 'ZC') && has('ZY', 'PY') && grp('Ресурс') < grp('Богатство')) out.push({ title: 'Жадность к Богатству разбивает Печать', quote: '印輕逢財', src: 'ЦПЦЦ гл.9, 印格', tone: 'bad',
    text: 'Погоня за деньгами съедает учёбу, здоровье, поддержку. При избытке Печати то же сочетание полезно — здесь Печать легче.' });
  if (has('SG', 'SS') && has('PC', 'ZC')) out.push({ title: 'Талант рождает деньги', quote: '伤官用财者富', src: 'ЮХ, 论十神; ЦПЦЦ гл.8', tone: a.ratio >= 0.4 ? 'good' : 'mixed',
    text: `Выражение (продукт, речь, ремесло) прямо переходит в доход.${a.ratio < 0.4 ? ' Хозяину нужна опора, иначе цепочка «отдал — получил» утомляет.' : ''}` });
  if (has('SG') && has('ZY', 'PY')) out.push({ title: 'Ранящий в узде Печати', quote: '傷官佩印', src: 'ЦПЦЦ гл.8, гл.14', tone: 'good',
    text: 'Резкий талант дисциплинирован знанием: эксперт, преподаватель, автор. «用之夏木，其秀百倍».' });
  if (STEMS[a.dm].yang && has('QS') && pillars(c).some((p) => stageOf(a.dm, p.branch) === 4)) out.push({ title: 'Клинок и Убийство', quote: '刃無煞不威，煞無刃不顯', src: 'СМ т.5; ЮХ', tone: 'good',
    text: 'Жёсткая сила встречает жёсткое давление: военная/хирургическая/кризисная сила, власть через риск.' });
  return out;
}

/** Ревнивый союз и снятие ударов (KB 10). */
export function bondNotes(c: Chart, a: Analysis): Note[] {
  const out: Note[] = [];
  const P = pillars(c);
  const pairOf = (s: number) => (s + 5) % 10;
  for (const p of P) {
    const mates = P.filter((q) => q !== p && q.stem === pairOf(p.stem));
    if (mates.length >= 2) out.push({ title: `Ревнивый союз ${STEMS[p.stem].ru}`, quote: '情不專', src: 'ЦПЦЦ гл.5; СМ т.2; ЮХ 化象', tone: 'mixed',
      text: `К ${STEMS[p.stem].ru} столпа ${P_RU[p.pos]} тянутся сразу ${mates.length} ${STEMS[mates[0].stem].ru} (${mates.map((m) => P_RU[m.pos]).join(' и ')}): союз не складывается, внимание делится — конкуренция за одно.` });
    const withDm = p.pos !== 'day' && P.find((q) => q.pos === 'day')!.stem === pairOf(p.stem);
    if (withDm && mates.length < 2) out.push({ title: `Союз с вами: ${STEMS[p.stem].ru}`, quote: '惟是本身十干合之，不爲合去', src: 'ЦПЦЦ гл.5', tone: 'good',
      text: `«${godOf(a.dm, p.stem).ru}» столпа ${P_RU[p.pos]} в союзе с самим господином дня — не уводится, а притягивается к вам.` });
  }
  const month = P.find((p) => p.pos === 'month')!;
  for (const p of P) if (p.pos !== 'month' && Math.abs(p.branch - month.branch) === 6)
    out.push({ title: 'Удар по месяцу', quote: '提纲有用，最怕刑冲', src: 'СМ т.12; т.10 «忌年與時衝月支»', tone: 'bad',
      text: `${BRANCHES[p.branch].animal} ${P_RU[p.pos]} бьёт ветвь месяца — ось карты расшатана; ${p.pos === 'day' ? 'но удар дня по месяцу мягче («日支自衝不妨»)' : 'это тяжелее всего'}.` });
  return out;
}

/** Нрав двух сильнейших богов (по весу). */
export function godNatureNotes(a: Analysis): Note[] {
  return Object.entries(a.gods).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k]) => ({
    title: `${GODS[k].ru} (${GODS[k].zh})`, text: `${GOD_KB[k].nature}.`, src: GOD_KB[k].natureSrc,
  }));
}

/** Такт/год подробно: стадия господина в ветви, удары по месяцу и дню, повтор столпа дня. */
export function luckDetail(c: Chart, a: Analysis, idx: number): string[] {
  const s = idx % 10, b = idx % 12, out: string[] = [];
  const st = stageOf(a.dm, b);
  out.push(`Ваша стихия в этот период: ${['силы прибывают', 'силы неустойчивы', 'силы растут', 'силы в рабочей форме', 'силы на пике', 'силы понемногу убывают', 'сил меньше обычного', 'сил мало', 'силы уходят внутрь, копятся', 'силы на нуле — время перезагрузки', 'зреет новое начало', 'силы набираются'][st]}.`);
  const day = pillars(c).find((p) => p.pos === 'day')!, month = pillars(c).find((p) => p.pos === 'month')!;
  if (Math.abs(b - month.branch) === 6) out.push('Встряска в работе и основе жизни.');
  if (Math.abs(b - day.branch) === 6 && Math.abs(s - day.stem) === 6) out.push('Сильная встряска в доме, паре и здоровье — самый резкий тип периода.');
  if (idx === day.idx) out.push('Период повторяет ваш знак дня — застой и возврат старых тем.');
  const month2 = pillars(c).find((p) => p.pos === 'month')!;
  const need = [...TIAOHOU[a.dm][month2.branch]].map((z) => SZ.indexOf(z));
  if (need.includes(s)) out.push('Приходит стихия, которой карте не хватает для равновесия.');
  if (BRANCHES[month2.branch].hidden[0] === s && STEMS[s].el !== a.dmEl) out.push(`Проявляется главная тема карты — «${godOf(a.dm, s).ru}».`);
  if ((s + 5) % 10 === a.dm) out.push(`Период в союзе с вами — «${godOf(a.dm, s).ru}» притягивается к вам.`);
  return out;
}

/** Портрет «Кто вы» — по KB 18: тип силы, черта/тень, точка срыва, снаружи/внутри. Стих ствола (STEM_VERSE) — только в подробном разборе (08.10: без имён стволов в основном потоке). */
export function portrait(c: Chart, a: Analysis): string[] {
  const ax = axisNote(c, a), g = GODS[ax.godKey];
  return [
    ...describe(c, a).lines,
    ax.godKey === 'BJ' || ax.godKey === 'JC' ? '' : `Главная тема жизни: ${g.sense}.`,
  ].filter(Boolean);
}
