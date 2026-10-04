// Библиотека карт мастеров: 302 карты из книг (bench/gold.json проекта знаний) — полезный бог мастера против нашего мозга.
// Мозг смотрит только на столпы, дата не нужна (как tools/bench_masters.ts).
import { analyze, type Chart } from './calc';
import type { El } from './core';

const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥';
export const BOOK_RU: Record<string, string> = {
  '滴天髓阐微': 'Жэнь Тецяо, «Ди тянь суй чань вэй»', '子平真诠评注': 'Сюй Лэу, «Цзы пин чжэнь цюань пин чжу»',
  '八字与用神': 'Чжу Цзуся, «Ба цзы юй юн шэнь»', '千里命稿': 'Вэй Цяньли, «Цяньли мин гао»', '四柱预测经验技巧': 'Дай Юнчан, «Сы чжу юй цэ»',
};
export interface MasterRow { id: number; master: string; book: string; pillars: string[]; yong: El; phrase: string; ours: El; xi: El[]; hit: 'yes' | 'xi' | 'no' }

const pillar = (s: string, pos: string) => {
  const stem = G.indexOf(s[0]), branch = Z.indexOf(s[1]);
  return { pos, stem, branch, idx: [...Array(60).keys()].find((i) => i % 10 === stem && i % 12 === branch)! } as Chart['pillars'][number];
};
export const chartOf = (p: string[]) =>
  ({ pillars: [pillar(p[3], 'hour'), pillar(p[2], 'day'), pillar(p[1], 'month'), pillar(p[0], 'year')], luck: [] }) as unknown as Chart;

export async function masterRows(): Promise<MasterRow[]> {
  const data = (await import('./masters.json')).default as { id: number; m: string; b: string; p: string[]; y: number; ph: string }[];
  return data.map((c) => {
    const b = analyze(chartOf(c.p)).brain, y = c.y as El;
    return { id: c.id, master: c.m, book: c.b, pillars: c.p, yong: y, phrase: c.ph, ours: b.yong, xi: b.xi,
      hit: b.yong === y ? 'yes' : b.xi.includes(y) ? 'xi' : 'no' };
  });
}
