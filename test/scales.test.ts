import { describe, expect, it } from 'vitest';
import { BODY_LEVEL, LEVELS, expLabel, shapeFor } from '../src/scene/scales';

const body = new Float32Array(300).map(() => Math.random());

describe('лестница масштабов §4.2', () => {
  it('порядки растут монотонно и покрывают ≥ 12 порядков в обе стороны', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].exp).toBeGreaterThan(LEVELS[i - 1].exp);
    expect(LEVELS[0].exp).toBeLessThanOrEqual(-12);
    expect(LEVELS[LEVELS.length - 1].exp).toBeGreaterThanOrEqual(12);
  });
  it('у каждой ступени настоящее число, тег и источник (§4.10)', () => {
    for (const l of LEVELS) { expect(l.fact).toMatch(/\d/); expect(['ТОЧНО', 'ОЦЕНКА']).toContain(l.tag); expect(l.source.length).toBeGreaterThan(3); }
  });
  it('формы конечны, той же длины, тело = исходные позиции', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const s = shapeFor(i, body);
      expect(s.length).toBe(body.length);
      expect(s.every(Number.isFinite)).toBe(true);
    }
    expect(Array.from(shapeFor(BODY_LEVEL, body))).toEqual(Array.from(body));
    expect(shapeFor(0, body)).toEqual(shapeFor(0, body)); // детерминизм
  });
  it('подпись порядка', () => {
    expect(expLabel(0)).toBe('10⁰ м'); expect(expLabel(-15)).toBe('10⁻¹⁵ м'); expect(expLabel(26)).toBe('10²⁶ м');
  });
});
