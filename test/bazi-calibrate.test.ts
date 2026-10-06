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
