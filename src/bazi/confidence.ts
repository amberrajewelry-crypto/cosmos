// Насколько можно доверять полезному богу (用神) мозга: доля совпадений с разборами мастеров для карт того же типа
// (сила × что выбрано). Эталон — 302 карты 任铁樵/徐乐吾/朱祖夏/韦千里/戴永长 (bench/gold.json);
// пересчёт: npx tsx ~/projects/бацзы/tools/bench_masters.ts --conf  (вставить вывод сюда).
import type { Analysis } from './calc';

// ключ «сила:отношение 用神 к господину дня» (0 свои, 1 выражение, 2 богатство, 3 власть, 4 печать) → [карт, 用 совпал, в 用+喜]
export const CONF: Record<string, [number, number, number]> = {"balanced:4":[15,3,7],"balanced:2":[21,10,15],"strong:1":[57,33,47],"balanced:1":[23,6,14],"strong:3":[47,18,25],"balanced:3":[18,8,11],"strong:2":[35,15,28],"weak:4":[52,27,35],"special:1":[1,1,1],"weak:0":[17,5,9],"special:3":[2,1,1],"balanced:0":[6,1,5],"special:0":[5,2,3],"special:2":[2,1,1],"special:4":[1,1,1]};

export interface Confidence { level: 'mid' | 'low' | 'vlow'; of10: number; n: number; ru: string; text: string }

export function confidence(a: Analysis): Confidence {
  const b = a.brain, kind = b.frame.kind === 'normal' ? b.power.key : 'special';
  const [n, hit] = CONF[`${kind}:${(b.yong - a.dmEl + 5) % 5}`] ?? [0, 0];
  // мало карт этого типа — берём общий уровень (44%)
  const p = n >= 10 ? hit / n : 0.44, of10 = Math.round(p * 10);
  const level = p >= 0.5 ? 'mid' : p >= 0.35 ? 'low' : 'vlow';
  const ru = { mid: 'средняя', low: 'ниже средней', vlow: 'низкая' }[level];
  const text = `Для карт такого типа расчёт совпадает с разборами старых мастеров примерно в ${of10} из 10 случаев${n < 10 ? ' (таких карт в сверке мало — взят общий уровень)' : ''}.${b.power.key === 'balanced' ? ' Сила на грани: в разные десятилетия полезным может становиться другая стихия — сайт это учитывает.' : ''}`;
  return { level, of10, n, ru, text };
}
