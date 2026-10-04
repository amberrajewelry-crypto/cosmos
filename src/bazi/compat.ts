// Совместимость двух карт (KB 14 §4): не таблицы по годам («其谬甚矣», ШФ 男女合婚说), а 用/忌 двух карт и ветви/стволы дня.
// Итог — «легче / труднее», никогда «нельзя».
import { STEMS, BRANCHES, EL, type El } from './core';
import type { Analysis, Chart } from './calc';

export type CTone = 'good' | 'bad' | 'mixed';
export interface CItem { title: string; tone: CTone; text: string; quote?: string; src?: string }
export interface Compat { tone: CTone; summary: string; items: CItem[] }

const W = (a: Analysis, e: El) => (a.brain.yong === e ? 2 : a.brain.xi.includes(e) ? 1 : a.brain.ji.includes(e) ? -1.5 : 0);
const top2 = (a: Analysis) => ([0, 1, 2, 3, 4] as El[]).sort((x, y) => a.pct[y] - a.pct[x]).slice(0, 2);
const toneOf = (x: number, lo = -0.5, hi = 0.5): CTone => (x > hi ? 'good' : x < lo ? 'bad' : 'mixed');
const day = (c: Chart) => c.pillars.find((p) => p.pos === 'day')!;

/** Насколько сильные стихии партнёра (b) служат полезному богу карты a. */
function gives(a: Analysis, b: Analysis, who: string): { score: number; text: string } {
  const [e1, e2] = top2(b);
  const score = W(a, e1) * b.pct[e1] * 2 + W(a, e2) * b.pct[e2] * 2;
  const say = (e: El) => `${EL[e]} (${Math.round(b.pct[e] * 100)}%) — ${W(a, e) > 0 ? `полезно ${who}` : W(a, e) < 0 ? `нагружает ${who === 'вам' ? 'вас' : 'партнёра'}` : `нейтрально для ${who === 'вам' ? 'вас' : 'партнёра'}`}`;
  return { score, text: `${say(e1)}; ${say(e2)}` };
}

export function compat(c1: Chart, a1: Analysis, c2: Chart, a2: Analysis): Compat {
  const items: CItem[] = [];
  const g12 = gives(a1, a2, 'вам'), g21 = gives(a2, a1, 'партнёру');
  items.push({
    title: 'Что партнёр приносит вам', tone: toneOf(g12.score), text: `Сильнее всего в карте партнёра: ${g12.text}.`,
    quote: '用庚者，土妻金子', src: 'ЦТБЦ (KB 12 §1): партнёр — стихия, что служит вашему полезному богу',
  });
  items.push({ title: 'Что вы приносите партнёру', tone: toneOf(g21.score), text: `Сильнее всего в вашей карте: ${g21.text}.` });
  if (a1.brain.yong === a2.brain.yong) items.push({ title: 'Общий полезный бог', tone: 'good', text: `Вам обоим нужна ${EL[a1.brain.yong]} — одни и те же места, занятия и периоды поднимают вас вместе.` });
  else if (a1.brain.ji.includes(a2.brain.yong) && a2.brain.ji.includes(a1.brain.yong)) items.push({ title: 'Противоположные нужды', tone: 'bad', text: `Вам нужна ${EL[a1.brain.yong]}, партнёру — ${EL[a2.brain.yong]}, и каждая нагружает другого: договаривайтесь, чьё время и место сейчас.` });

  const d1 = day(c1), d2 = day(c2);
  const b1 = d1.branch, b2 = d2.branch;
  if ((b1 + b2) % 12 === 1) items.push({ title: 'Дворцы партнёра в союзе', tone: 'good', text: `Ветви дня ${BRANCHES[b1].animal} и ${BRANCHES[b2].animal} образуют союз: дом и быт складываются легко.`, src: 'KB 14 §4: ветви дня — союз/удар' });
  else if (Math.abs(b1 - b2) === 6) items.push({ title: 'Дворцы партнёра в ударе', tone: 'bad', text: `Ветви дня ${BRANCHES[b1].animal} и ${BRANCHES[b2].animal} бьют друг друга: в быту много движения и споров — нужны ясные правила дома.`, src: 'KB 14 §4; ЦПЦЦ-Х гл.28 (тип удара)' });
  else if (b1 === b2) items.push({ title: 'Одинаковые дворцы', tone: 'mixed', text: `У обоих ветвь дня ${BRANCHES[b1].animal}: похожие привычки дома — понятно, но и соперничество за одно место.` });
  if ((d1.stem + 5) % 10 === d2.stem) items.push({ title: 'Стволы дня в союзе', tone: 'good', text: `${STEMS[d1.stem].ru} и ${STEMS[d2.stem].ru} — пара-союз господ дня: сильное взаимное притяжение.`, quote: '惟是本身十干合之，不爲合去', src: 'ЦПЦЦ гл.5 (KB 14 §2)' });
  else if ((STEMS[d1.stem].el + 2) % 5 === STEMS[d2.stem].el || (STEMS[d2.stem].el + 2) % 5 === STEMS[d1.stem].el) {
    const boss = (STEMS[d1.stem].el + 2) % 5 === STEMS[d2.stem].el ? 'вы' : 'партнёр';
    items.push({ title: 'Один направляет другого', tone: 'mixed', text: `${EL[STEMS[d1.stem].el]} и ${EL[STEMS[d2.stem].el]}: ${boss === 'вы' ? 'вы' : 'партнёр'} задаёт рамки — хорошо, если ведомому это полезно, иначе давит.` });
  }

  const sum = items.reduce((s, i) => s + (i.tone === 'good' ? 1 : i.tone === 'bad' ? -1 : 0), 0);
  const tone: CTone = sum >= 2 ? 'good' : sum <= -1 ? 'bad' : 'mixed';
  const summary = tone === 'good' ? 'Союз легче среднего: карты друг друга поддерживают.'
    : tone === 'bad' ? 'Союз труднее среднего: нужны осознанные договорённости. Это не запрет — классика судит пары не по одной карте.'
      : 'Союз смешанный: в чём-то поддержка, в чём-то трение — многое решают выбор и периоды.';
  return { tone, summary, items };
}
