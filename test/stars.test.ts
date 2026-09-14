import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { toEcliptic, zodiacLines, nearestLightStar, type StarCatalog } from '../src/data/stars';

const cat = JSON.parse(readFileSync('public/stars.json', 'utf8')) as StarCatalog;

describe('каталог звёзд', () => {
  it('Регул: RA/Dec → эклиптика (λ≈149.9°, β≈+0.46°)', () => {
    const [lon, lat] = toEcliptic(152.0930, 11.9672);
    expect(lon).toBeCloseTo(149.9, 0); expect(lat).toBeCloseTo(0.46, 1);
  });
  it('1084 звезды, 88 созвездий, 13 зодиакальных дают линии', () => {
    expect(cat.stars.length).toBeGreaterThan(1000);
    expect(Object.keys(cat.constellations).length).toBe(88);
    expect(zodiacLines(cat, 2026).length).toBe(50);
  });
  it('звезда рождения: 25 лет → Вега (25.0 св. лет)', () => {
    const s = nearestLightStar(cat, 25)!;
    expect(s.name).toBe('Вега'); expect(s.ly).toBeCloseTo(25.0, 0);
  });
});
