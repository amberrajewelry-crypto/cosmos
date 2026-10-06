// Насколько можно доверять полезному богу (用神) мозга. Цифры — ТОЛЬКО по отложенной выборке (HOLDOUT, 100 из 302 карт
// 任铁樵/徐乐吾/朱祖夏/韦千里/戴永长, заморожена 06.10.2026; на ней правила не подбирались), сгруппировано по силе.
// Эталон проверен второй слепой разметкой: 61 из 62 совпали (bench/irr). Пересчёт: bench_masters.ts --conf.
import type { Analysis } from './calc';

// сила → [карт, 用 совпал, в 用+喜]
export const CONF: Record<string, [number, number, number]> = {"strong":[49,21,35],"balanced":[29,10,17],"special":[4,4,4],"weak":[18,9,12]};
const ALL: [number, number, number] = [100, 44, 68];

export interface Confidence { level: 'mid' | 'low' | 'vlow'; of10: number; soft10: number; n: number; ru: string; text: string }

export function confidence(a: Analysis): Confidence {
  const b = a.brain, kind = b.frame.kind === 'normal' ? b.power.key : 'special';
  const own = CONF[kind], small = !own || own[0] < 15;
  const [n, hit, soft] = small ? ALL : own;
  const p = hit / n, of10 = Math.round(p * 10), soft10 = Math.round((soft / n) * 10);
  const level = p >= 0.5 ? 'mid' : p >= 0.35 ? 'low' : 'vlow';
  const ru = { mid: 'средняя', low: 'ниже средней', vlow: 'низкая' }[level];
  const text = `Главная полезная стихия для карт такого типа совпадает с выбором старых мастеров примерно в ${of10} из 10 случаев, `
    + `а среди двух первых полезных стихий оказывается в ${soft10} из 10${small ? ' (таких карт в проверке мало — взят общий уровень)' : ''}. `
    + `Проверено на картах, по которым расчёт не настраивали.`
    + (b.power.key === 'balanced' ? ' Сила на грани: в разные десятилетия полезной может становиться другая стихия — сайт это учитывает.' : '');
  return { level, of10, soft10, n, ru, text };
}
