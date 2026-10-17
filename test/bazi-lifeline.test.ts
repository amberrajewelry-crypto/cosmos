import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { lifeLine, lifeLineSvg } from '../src/bazi/lifeline';

const input = { date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true, place: 'Kutaisi' };
describe('линия жизни', () => {
  const c = computeChart(input as never, DEFAULT_VARIANT), a = analyze(c), pts = lifeLine(c, a);
  it('81 точка, годы подряд с года рождения, значения в [-1, 1]', () => {
    expect(pts).toHaveLength(81);
    expect(pts[0].year).toBe(1991); expect(pts[80].year).toBe(2071);
    expect(pts.every((p) => p.v >= -1 && p.v <= 1)).toBe(true);
  });
  it('линия не плоская (такты различаются)', () => {
    expect(new Set(pts.map((p) => p.v.toFixed(2))).size).toBeGreaterThan(5);
  });
  it('SVG с отметкой «сейчас»', () => {
    expect(lifeLineSvg(pts, 2026)).toContain('сейчас');
    expect(lifeLineSvg(pts, 2200)).not.toContain('ll-now');
  });
});
