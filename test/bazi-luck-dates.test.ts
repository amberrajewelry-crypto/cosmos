import { describe, it, expect } from 'vitest';
import { computeChart, DEFAULT_VARIANT, luckIndexAt, luckYears } from '../src/bazi/calc';
import { dayInfo } from '../src/bazi/days';
import { analyze } from '../src/bazi/calc';

const inp = { date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true };

describe('такт — по точной дате смены', () => {
  const c = computeChart(inp, DEFAULT_VARIANT);
  const i = c.luck.findIndex((l) => l.year === 2022);
  it('乙未 действует 2022–2032, смена 7.07.2032 (как tools/jieqi.py)', () => {
    expect(luckYears(c, i)).toBe('2022–2032');
    const d = new Date(c.luck[i + 1].start!);
    expect([d.getUTCFullYear(), d.getUTCMonth() + 1]).toEqual([2032, 7]);
    expect(Math.abs(d.getUTCDate() - 7)).toBeLessThanOrEqual(1);
  });
  it('в начале 2032 года ещё старый такт, после смены — новый', () => {
    expect(luckIndexAt(c, Date.UTC(2032, 2, 1))).toBe(i);
    expect(luckIndexAt(c, Date.UTC(2032, 7, 1))).toBe(i + 1);
    expect(luckIndexAt(c, Date.UTC(1991, 10, 11))).toBe(-1);
  });
  it('день весной 2032 считается в старом такте, осенью — в новом', () => {
    const a = analyze(c);
    const s = dayInfo(c, a, 2032, 3, 10);
    const f = dayInfo(c, a, 2032, 9, 10);
    expect(s).toBeTruthy(); expect(f).toBeTruthy();
  });
});
