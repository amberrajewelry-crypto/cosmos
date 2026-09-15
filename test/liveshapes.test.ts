import { describe, expect, it } from 'vitest';
import { helioPlanets, starsAltAz } from '../src/compute/liveshapes';
import { Horizon, Observer } from 'astronomy-engine';

describe('живые данные форм', () => {
  it('гелиоцентрические радиусы планет близки к большим полуосям', () => {
    const p = helioPlanets(new Date('2026-09-14T12:00:00Z'));
    const r = Object.fromEntries(p.map((q) => [q.key, Math.hypot(q.x, q.y)]));
    expect(r.earth).toBeCloseTo(1.0, 1); expect(r.mars).toBeGreaterThan(1.38); expect(r.mars).toBeLessThan(1.67);
    expect(r.mercury).toBeLessThan(0.47); expect(r.venus).toBeCloseTo(0.72, 1);
  });
  it('alt/az звезды совпадает с astronomy-engine в пределах 1°', () => {
    const when = new Date('2026-09-14T20:00:00Z'), lat = 41.7, lon = 44.8;
    const vega: [number, number, number, number, number, string] = [91262, 279.2347, 38.7837, 0.03, 130, 'Vega'];
    const [s] = starsAltAz({ stars: [vega], lines: {} } as never, lat, lon, when);
    const obs = new Observer(lat, lon, 0);
    const h = Horizon(when, obs, vega[1] / 15, vega[2], 'normal');
    expect(Math.abs(s.alt - h.altitude)).toBeLessThan(1);
    expect(Math.abs(((s.az - h.azimuth + 540) % 360) - 180)).toBeLessThan(1);
  });
});
