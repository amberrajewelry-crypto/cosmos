import { describe, it, expect } from 'vitest';
import { precessionOffsetDeg } from '../src/compute/precession';
import { natalSVG } from '../src/natal/chart';

describe('прецессия и карта рождения (§4.8)', () => {
  it('сдвиг прецессии ~24° в наши годы', () => {
    const o = precessionOffsetDeg(new Date('2026-01-01T00:00:00Z'));
    expect(o).toBeGreaterThan(23.5);
    expect(o).toBeLessThan(24.6);
  });
  it('сдвиг растёт со временем (прецессия идёт)', () => {
    const a = precessionOffsetDeg(new Date('2000-01-01T00:00:00Z'));
    const b = precessionOffsetDeg(new Date('2100-01-01T00:00:00Z'));
    expect(b).toBeGreaterThan(a);
  });
  it('SVG-карта: 12 знаков, кольцо вращается, Солнце на месте', () => {
    const svg = natalSVG({ sunLon: 90, rotationDeg: 0 });
    expect(svg).toContain('id="signRing"');
    expect((svg.match(/<text/g) ?? []).length).toBeGreaterThanOrEqual(12); // 12 глифов + ☉
    expect(svg).toContain('rotate(0');
  });
});
