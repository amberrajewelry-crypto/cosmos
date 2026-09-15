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
      expect(s.pos.length).toBe(body.length); expect(s.col.length).toBe(body.length);
      expect(s.pos.every(Number.isFinite)).toBe(true);
      expect(s.col.every((c) => c >= 0 && c <= 1)).toBe(true);
    }
    expect(Array.from(shapeFor(BODY_LEVEL, body).pos)).toEqual(Array.from(body));
    expect(shapeFor(0, body)).toEqual(shapeFor(0, body)); // детерминизм
  });
  it('живые данные меняют горизонт, орбиту и магнитосферу', () => {
    const hor = LEVELS.findIndex((l) => l.exp === 4), orb = LEVELS.findIndex((l) => l.exp === 11), mag = LEVELS.findIndex((l) => l.exp === 7);
    expect(shapeFor(hor, body, undefined, { stars: [{ alt: 45, az: 90, mag: 0 }] }).pos).not.toEqual(shapeFor(hor, body).pos);
    expect(shapeFor(orb, body, undefined, { planets: [{ key: 'earth', x: 0, y: 1 }] }).pos).not.toEqual(shapeFor(orb, body).pos);
    expect(shapeFor(mag, body, undefined, { kp: 9 }).col).not.toEqual(shapeFor(mag, body, undefined, { kp: 0 }).col);
    // звезда под горизонтом отфильтрована: форма совпадает с формой без звёзд
    expect(shapeFor(hor, body, undefined, { stars: [{ alt: -30, az: 0, mag: 0 }] }).pos).toEqual(shapeFor(hor, body).pos);
  });
  it('подпись порядка', () => {
    expect(expLabel(0)).toBe('10⁰ м'); expect(expLabel(-15)).toBe('10⁻¹⁵ м'); expect(expLabel(26)).toBe('10²⁶ м');
  });
});
