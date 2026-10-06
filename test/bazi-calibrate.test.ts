import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT, yearIdx } from '../src/bazi/calc';
import { calibrate, applyHypo } from '../src/bazi/calibrate';
import { periodVerdict } from '../src/bazi/brain';

const inp = { date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true };

describe('сверка по прошлому', () => {
  it('меньше 5 событий — вердикт «мало»', () => {
    const c = computeChart(inp, DEFAULT_VARIANT);
    expect(calibrate(c, analyze(c), [{ year: 2020, good: true }]).verdict).toBe('few');
  });
  it('события, совпадающие с разбором, его подтверждают', () => {
    const c = computeChart(inp, DEFAULT_VARIANT), a = analyze(c);
    const evs = [];
    for (let y = 2005; y <= 2025 && evs.length < 8; y++) {
      const t = periodVerdict(a.brain, yearIdx(y), c).tone;
      if (t === 'good' || t === 'bad') evs.push({ year: y, good: t === 'good' });
    }
    const r = calibrate(c, a, evs);
    expect(r.base.hits).toBeGreaterThanOrEqual(r.base.miss);
    expect(r.verdict).not.toBe('changed');
  });
  it('события против разбора дают другой расклад, и его можно применить', () => {
    const c = computeChart(inp, DEFAULT_VARIANT), a = analyze(c);
    const evs = [];
    for (let y = 2000; y <= 2025 && evs.length < 9; y++) {
      const t = periodVerdict(a.brain, yearIdx(y), c).tone;
      if (t === 'good' || t === 'bad') evs.push({ year: y, good: t === 'bad' });
    }
    const r = calibrate(c, a, evs);
    expect(r.best.id).not.toBe('base');
    applyHypo(a, r.best);
    expect(a.brain.yong).toBe(r.best.yong);
    expect(a.consensus[0]).toBe(r.best.yong);
  });
});

import { dayInfo } from '../src/bazi/days';
import { encodeSet, decodeSet } from '../src/bazi/calibrate';
describe('сверка: дни журнала и адрес', () => {
  it('дни, совпадающие с прогнозом, засчитываются разбору', () => {
    const c = computeChart(inp, DEFAULT_VARIANT), a = analyze(c);
    const days = [];
    for (let k = 1; k <= 28; k++) { const iso = `2026-02-${String(k).padStart(2, '0')}`, s = dayInfo(c, a, 2026, 2, k).score; if (s) days.push({ iso, good: s > 0 }); }
    const r = calibrate(c, a, [], days);
    expect(r.base.dHits).toBe(days.length);
    expect(r.base.dMiss).toBe(0);
  });
  it('набор кодируется в адрес и обратно', () => {
    const s = { yong: 4 as const, xi: [1 as const], ji: [2 as const, 3 as const] };
    expect(decodeSet(encodeSet(s))).toMatchObject(s);
    expect(decodeSet('x')).toBeNull();
  });
});
