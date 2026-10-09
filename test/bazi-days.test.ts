import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { pillarName } from '../src/bazi/core';
import { dayIdx, dayInfo, daysFrom, showThenClose } from '../src/bazi/days';
const c = computeChart({ date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
const a = analyze(c);
describe('bazi days', () => {
  it('день цикла 60: 2000-01-01 = 戊午, 1991-11-10 = 甲申', () => {
    expect(pillarName(dayIdx(2000, 1, 1))).toBe('戊午');
    expect(pillarName(dayIdx(1991, 11, 10))).toBe('甲申');
  });
  it('месяц по 寒露: 7.10.2026 ещё 丁酉, 9.10 уже 戊戌', () => {
    expect(pillarName(dayInfo(c, a, 2026, 10, 7).monthIdx)).toBe('丁酉');
    expect(pillarName(dayInfo(c, a, 2026, 10, 9).monthIdx)).toBe('戊戌');
  });
  it('типы дней для 甲申: 20.10 сильный, 19.10 удар по ветви дня, 5.10 нагрузка', () => {
    // kind — по стихии дня; type — ярлык, согласованный с оценкой (сильный ≥4, нагрузка ≤2)
    const d20 = dayInfo(c, a, 2026, 10, 20);
    expect(d20.kind).toBe('peak');
    expect(d20.type).toBe(d20.score >= 4 ? 'peak' : 'calm');
    const d19 = dayInfo(c, a, 2026, 10, 19);
    expect(d19.kind).toBe('peak-hit');
    expect(d19.type).toBe(d19.score <= 2 ? 'heavy' : d19.score >= 4 ? 'peak-hit' : 'calm');
    expect(d19.notes.join()).toMatch(/встряска в сфере «дом/);
    expect(dayInfo(c, a, 2026, 10, 5).type).toBe('heavy');
  });
  it('ярлык дня не спорит с оценкой', () => {
    for (const d of daysFrom(c, a, new Date(2026, 0, 1), 365)) {
      if (d.type === 'peak' || d.type === 'peak-hit') expect(d.score).toBeGreaterThanOrEqual(4);
      if (d.type === 'heavy') expect(d.score).toBeLessThanOrEqual(2);
    }
  });
  it('связка покажи→закрой: 20→21.10.2026', () => {
    const p = showThenClose(daysFrom(c, a, new Date(2026, 9, 3), 30)).map(([x, y]) => x.iso + '>' + y.iso);
    expect(p).toContain('2026-10-20>2026-10-21');
  });
});
describe('bazi days: текст переживает lay() на сайте', () => {
  it('в notes/warn/good нет «…» — (lay вырезал бы сферу), why без «становится полезной»', () => {
    const ds = daysFrom(c, a, new Date(2026, 0, 1), 400);
    const txt = ds.flatMap((d) => [...d.notes, ...d.warn, ...(d.good ?? [])]);
    expect(txt.filter((t) => /«[^»]*»\s*—/.test(t))).toEqual([]);
    expect(ds.some((d) => /в сфере «/.test([...d.warn, ...d.notes].join()))).toBe(true);
    expect(ds.filter((d) => /становится полезной/.test(d.why))).toEqual([]);
  });
});
