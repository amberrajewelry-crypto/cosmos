import { describe as d, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { describe, powerType } from '../src/bazi/describe';

const mk = (date: string, time = '12:00') => {
  const c = computeChart({ date, time, timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
  return { c, a: analyze(c) };
};

d('портрет по KB 18', () => {
  it('карта Владимира: 4+ строк, черта/тень, снаружи/внутри', () => {
    const { c, a } = mk('1991-11-10', '00:37');
    const r = describe(c, a);
    expect(r.lines.length).toBeGreaterThanOrEqual(4);
    expect(r.lines.join(' ')).toContain('сильная сторона');
    expect(r.lines.join(' ')).toMatch(/Со стороны|Каким вас видят/);
    expect(r.detail.join(' ')).toContain('ЦЛ');
  });
  it('различает: на 400 картах не меньше 4 типов, ни один не берёт > 60%', () => {
    const cnt: Record<string, number> = {};
    for (let i = 0; i < 400; i++) {
      const t = new Date(Date.UTC(1950, 0, 1) + i * 131.7 * 864e5).toISOString().slice(0, 10);
      const { c, a } = mk(t, `${String((i * 7) % 24).padStart(2, '0')}:30`);
      const k = powerType(c, a); cnt[k] = (cnt[k] ?? 0) + 1;
    }
    expect(Object.keys(cnt).length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...Object.values(cnt))).toBeLessThan(240);
  });
});
d('портрет без «крайностей мало» рядом с «с крайностями»', () => {
  it('300 карт', () => {
    const bad: string[] = [];
    for (let i = 0; i < 300; i++) {
      const dt = new Date(Date.UTC(1950, 0, 1) + i * 86400000 * 97.3), date = dt.toISOString().slice(0, 10), time = `${String((i * 7) % 24).padStart(2, '0')}:10`;
      const { c, a } = mk(date, time), t = describe(c, a).lines.join(' ');
      if (/крайностей в характере мало/.test(t) && /с крайностями/.test(t)) bad.push(date);
    }
    expect(bad).toEqual([]);
  });
});
