import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { rasklad } from '../src/bazi/rasklad';

const mk = (timeKnown: boolean, male = true) => {
  const c = computeChart({ date: '1991-11-10', time: '00:37', timeKnown, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male }, DEFAULT_VARIANT);
  return rasklad(c, analyze(c), new Date('2026-10-06'));
};

describe('расклад по 7 вопросам', () => {
  it('7 ответов, у каждого основание; в ответах нет процентов и иероглифов', () => {
    const r = mk(true);
    expect(r).toHaveLength(7);
    for (const x of r) {
      expect(x.a.length).toBeGreaterThan(0);
      expect(x.basis.length).toBeGreaterThan(5);
      expect(x.a.join(' ')).not.toMatch(/%|[一-鿿]/);
    }
  });
  it('4 животных с часом, 3 без часа', () => {
    expect(mk(true)[0].a[1].split(';')).toHaveLength(4);
    expect(mk(false)[0].a[1].split(';')).toHaveLength(3);
  });
  it('женская карта: партнёр по Власти, без падения', () => {
    expect(mk(true, false)[5].a[0]).toMatch(/Ваш тип/);
  });
});
