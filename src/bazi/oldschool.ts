// Вторичный слой старой (годовой) школы: 胎元, 命宫, 小运 (KB 01 §5–7). Школа 子平 (ЦПЦЦ, ДТС) их не использует —
// показываем справочно, в разбор и прогноз не включаем.
import { cyc } from './core';
import type { Chart } from './calc';

const mod = (a: number, n: number) => ((a % n) + n) % n;
const pillar = (c: Chart, pos: string) => c.pillars.find((p) => p.pos === pos);

/** 胎元: ствол месяца +1, ветвь месяца +3 (KB 01 §5). */
export function taiyuan(c: Chart): number {
  const m = pillar(c, 'month')!;
  return cyc((m.stem + 1) % 10, (m.branch + 3) % 12);
}

/** 命宫 (СМ т.2, 论坐命宫): месяц на ветвь от 子 назад, на него час, вперёд до 卯; ствол — 五虎遁 от года. Нужен час. */
export function minggong(c: Chart): number | null {
  const h = pillar(c, 'hour');
  if (!h) return null;
  const m = mod(pillar(c, 'month')!.branch - 2, 12);          // 0 = первый месяц (寅)
  const at = mod(-m, 12);                                      // где лежит месяц: 子, 亥, 戌…
  const b = mod(at + (3 - h.branch), 12);                       // где выпал 卯
  const start = ((pillar(c, 'year')!.stem % 5) * 2 + 2) % 10;   // ствол 寅 по 五虎遁
  return cyc(mod(start + b - 2, 10), b);
}

/** 小运 до первого большого такта: мужчина с 丙寅 вперёд, женщина с 壬申 назад (СМ т.2). По годам возраста 1…старт. */
export function xiaoyun(c: Chart): { age: number; idx: number }[] {
  const n = Math.max(1, Math.ceil(c.startAge));
  const first = c.input.male ? cyc(2, 2) : cyc(8, 8), dir = c.input.male ? 1 : -1;
  return Array.from({ length: n }, (_, i) => ({ age: i + 1, idx: mod(first + dir * i, 60) }));
}
