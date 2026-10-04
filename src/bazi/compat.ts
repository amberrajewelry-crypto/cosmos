// Совместимость двух карт (KB 14 §4): не таблицы по годам («其谬甚矣», ШФ 男女合婚说), а 用/忌 двух карт, правило ШФ
// 比劫 ↔ 食伤 и ветви/стволы дня. Три сферы: чувства и быт, поддержка и рост, деньги и общие дела. Итог — «легче / труднее».
import { STEMS, BRANCHES, EL, GODS, type El } from './core';
import type { Analysis, Chart } from './calc';

export type CTone = 'good' | 'bad' | 'mixed';
export type CSphere = 'home' | 'growth' | 'money';
export interface CItem { sphere: CSphere; title: string; tone: CTone; text: string; quote?: string; src?: string }
export interface Compat { tone: CTone; summary: string; spheres: { key: CSphere; title: string; tone: CTone }[]; items: CItem[] }
export const C_SPHERE: Record<CSphere, string> = { home: 'Чувства и быт', growth: 'Поддержка и рост', money: 'Деньги и общие дела' };

const W = (a: Analysis, e: El) => (a.brain.yong === e ? 2 : a.brain.xi.includes(e) ? 1 : a.brain.ji.includes(e) ? -1.5 : 0);
const top2 = (a: Analysis) => ([0, 1, 2, 3, 4] as El[]).sort((x, y) => a.pct[y] - a.pct[x]).slice(0, 2);
const toneOf = (x: number, lo = -0.5, hi = 0.5): CTone => (x > hi ? 'good' : x < lo ? 'bad' : 'mixed');
const day = (c: Chart) => c.pillars.find((p) => p.pos === 'day')!;
const share = (a: Analysis, group: string) => {
  const tot = Object.values(a.gods).reduce((s, w) => s + w, 0) || 1;
  return Object.entries(a.gods).filter(([k]) => GODS[k].group === group).reduce((s, [, w]) => s + w, 0) / tot;
};

/** Насколько сильные стихии партнёра (b) служат полезному богу карты a. */
function gives(a: Analysis, b: Analysis, who: string): { score: number; text: string } {
  const [e1, e2] = top2(b);
  const score = W(a, e1) * b.pct[e1] * 2 + W(a, e2) * b.pct[e2] * 2;
  const say = (e: El) => `${EL[e]} — ${W(a, e) > 0 ? `полезно ${who}` : W(a, e) < 0 ? `нагружает ${who === 'вам' ? 'вас' : 'партнёра'}` : `нейтрально для ${who === 'вам' ? 'вас' : 'партнёра'}`}`;
  return { score, text: `${say(e1)}; ${say(e2)}` };
}

export function compat(c1: Chart, a1: Analysis, c2: Chart, a2: Analysis): Compat {
  const items: CItem[] = [];
  // Поддержка и рост
  const g12 = gives(a1, a2, 'вам'), g21 = gives(a2, a1, 'партнёру');
  items.push({ sphere: 'growth', title: 'Что партнёр приносит вам', tone: toneOf(g12.score), text: `Сильнее всего в карте партнёра: ${g12.text}.`,
    quote: '用庚者，土妻金子', src: 'ЦТБЦ (KB 12 §1): партнёр — стихия, что служит вашему полезному богу' });
  items.push({ sphere: 'growth', title: 'Что вы приносите партнёру', tone: toneOf(g21.score), text: `Сильнее всего в вашей карте: ${g21.text}.` });
  if (a1.brain.yong === a2.brain.yong) items.push({ sphere: 'growth', title: 'Общий полезный бог', tone: 'good', text: `Вам обоим нужна ${EL[a1.brain.yong]} — одни и те же места, занятия и периоды поднимают вас вместе.` });
  else if (a1.brain.ji.includes(a2.brain.yong) && a2.brain.ji.includes(a1.brain.yong)) items.push({ sphere: 'growth', title: 'Противоположные нужды', tone: 'bad', text: `Вам нужна ${EL[a1.brain.yong]}, партнёру — ${EL[a2.brain.yong]}, и каждая нагружает другого: договаривайтесь, чьё время и место сейчас.` });

  // Чувства и быт
  const d1 = day(c1), d2 = day(c2), b1 = d1.branch, b2 = d2.branch;
  if ((b1 + b2) % 12 === 1) items.push({ sphere: 'home', title: 'Знаки дома в союзе', tone: 'good', text: `Ваши знаки дома (${BRANCHES[b1].animal} и ${BRANCHES[b2].animal}) в союзе: дом и быт складываются легко.`, src: 'KB 14 §4: ветви дня — союз/удар' });
  else if (Math.abs(b1 - b2) === 6) items.push({ sphere: 'home', title: 'Знаки дома в противостоянии', tone: 'bad', text: `Ваши знаки дома (${BRANCHES[b1].animal} и ${BRANCHES[b2].animal}) противостоят: в быту много движения и споров — нужны ясные правила дома.`, src: 'KB 14 §4; ЦПЦЦ-Х гл.28 (тип удара)' });
  else if (b1 === b2) items.push({ sphere: 'home', title: 'Одинаковые знаки дома', tone: 'mixed', text: `У обоих знак дома — ${BRANCHES[b1].animal}: похожие привычки дома — понятно, но и соперничество за одно место.` });
  else items.push({ sphere: 'home', title: 'Знаки дома', tone: 'mixed', text: `Ваши знаки дома (${BRANCHES[b1].animal} и ${BRANCHES[b2].animal}) не в союзе и не в противостоянии: быт строится договорённостями, без встроенной лёгкости и без встроенного конфликта.` });
  const e1 = STEMS[d1.stem].el, e2 = STEMS[d2.stem].el;
  if ((d1.stem + 5) % 10 === d2.stem) items.push({ sphere: 'home', title: 'Ваши стихии в союзе', tone: 'good', text: `${STEMS[d1.stem].ru} и ${STEMS[d2.stem].ru} — природная пара: сильное взаимное притяжение.`, quote: '惟是本身十干合之，不爲合去', src: 'ЦПЦЦ гл.5 (KB 14 §2)' });
  else if ((e1 + 2) % 5 === e2 || (e2 + 2) % 5 === e1) items.push({ sphere: 'home', title: 'Один направляет другого', tone: 'mixed', text: `${EL[e1]} и ${EL[e2]}: ${(e1 + 2) % 5 === e2 ? 'вы задаёте' : 'партнёр задаёт'} рамки — хорошо, если ведомому это полезно, иначе давит.` });
  else if (e1 === e2) items.push({ sphere: 'home', title: 'Одна стихия', tone: 'mixed', text: `Оба — ${EL[e1].toLowerCase()}: понимаете друг друга без слов, но и тянете одеяло в одну сторону.` });
  else items.push({ sphere: 'home', title: 'Один питает другого', tone: 'good', text: `${EL[e1]} и ${EL[e2]} в порождающей связи: ${(e1 + 1) % 5 === e2 ? 'вы питаете партнёра' : 'партнёр питает вас'} — естественная забота.` });

  // Деньги и общие дела
  const bj1 = share(a1, 'Опора'), bj2 = share(a2, 'Опора'), ss1 = share(a1, 'Выражение'), ss2 = share(a2, 'Выражение');
  if ((bj1 >= 0.3 && ss2 >= 0.25) || (bj2 >= 0.3 && ss1 >= 0.25)) {
    const me = bj1 >= 0.3 && ss2 >= 0.25;
    items.push({ sphere: 'money', title: 'Сила одного находит выход в таланте другого', tone: 'good',
      text: `У ${me ? 'вас' : 'партнёра'} много «своих» (упорство, самостоятельность), у ${me ? 'партнёра' : 'вас'} — сильное выражение: это классическое правило удачной пары — общее дело получается.`,
      quote: '但当看男命，带比肩劫财重者，必择妇命带伤官食神重者配之', src: 'ШФ, 男女合婚说 (KB 14 §4)' });
  } else if (bj1 >= 0.3 && bj2 >= 0.3) items.push({ sphere: 'money', title: 'Два лидера', tone: 'bad', text: 'У обоих много «своих»: в общих деньгах и делах — соперничество за руль. Делите зоны ответственности и бюджеты.' });
  const w1 = ((a1.dmEl + 2) % 5) as El, w2 = ((a2.dmEl + 2) % 5) as El;
  const brings = (a: Analysis, w: El, b: Analysis) => W(a, w) > 0 && b.pct[w] >= 0.2;
  if (brings(a1, w1, a2) || brings(a2, w2, a1)) items.push({ sphere: 'money', title: 'Деньги через партнёра', tone: 'good',
    text: `${brings(a1, w1, a2) ? `В карте партнёра много вашего Богатства (${EL[w1].toLowerCase()}), и оно вам полезно` : `В вашей карте много Богатства партнёра (${EL[w2].toLowerCase()}), и оно ему полезно`}: вместе деньги идут легче, чем поодиночке.` });
  if (!items.some((i) => i.sphere === 'money')) items.push({ sphere: 'money', title: 'Общие дела', tone: 'mixed', text: 'Особой денежной связки между картами нет: общие деньги держатся на договорённостях, а не на «химии».' });

  const spheres = (Object.keys(C_SPHERE) as CSphere[]).map((k) => {
    const s = items.filter((i) => i.sphere === k).reduce((t, i) => t + (i.tone === 'good' ? 1 : i.tone === 'bad' ? -1 : 0), 0);
    return { key: k, title: C_SPHERE[k], tone: (s > 0 ? 'good' : s < 0 ? 'bad' : 'mixed') as CTone };
  });
  const sum = spheres.reduce((t, x) => t + (x.tone === 'good' ? 1 : x.tone === 'bad' ? -1 : 0), 0);
  const tone: CTone = sum >= 2 ? 'good' : sum <= -1 ? 'bad' : 'mixed';
  const summary = tone === 'good' ? 'Союз легче среднего: карты друг друга поддерживают.'
    : tone === 'bad' ? 'Союз труднее среднего: нужны осознанные договорённости. Это не запрет — многое решают выбор и периоды.'
      : 'Союз смешанный: в чём-то поддержка, в чём-то трение — многое решают выбор и периоды.';
  return { tone, summary, spheres, items };
}
