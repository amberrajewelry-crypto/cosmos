import { describe, it, expect } from 'vitest';
import { natalBodies } from '../src/compute/natalbodies';

describe('долготы тел на карте рождения (§4.7)', () => {
  it('7 тел, долготы 0..360', () => {
    const b = natalBodies(new Date('1990-05-14T12:00:00Z'));
    expect(b.length).toBe(7);
    b.forEach((x) => { expect(x.lon).toBeGreaterThanOrEqual(0); expect(x.lon).toBeLessThan(360); });
  });
  it('полнолуние 2026-01-03: Луна против Солнца (Δ≈180°)', () => {
    // Полнолуние 3 января 2026 ~10:03 UTC (NASA).
    const b = natalBodies(new Date('2026-01-03T10:03:00Z'));
    const sun = b.find((x) => x.key === 'sun')!.lon, moon = b.find((x) => x.key === 'moon')!.lon;
    const d = Math.abs((((moon - sun) % 360) + 360) % 360 - 180);
    expect(d).toBeLessThan(1.5);
  });
});
