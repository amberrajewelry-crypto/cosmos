import { describe, it, expect } from 'vitest';
import { sunAltitude, sunAzimuth, moonAltitude } from '../src/compute/sky';

// A4-регрессия (§3.8): эталоны JPL Horizons для Тбилиси 2026-06-21 09:00 UT.
// Ловит дрейф формул. Полный разбор — VERIFICATION.md.
const LAT = 41.72, LON = 44.79;
const T = new Date('2026-06-21T09:00:00Z');

describe('A4 — сверка с JPL Horizons', () => {
  it('высота Солнца в пределах 0.02° от Horizons (71.708953°)', () => {
    expect(Math.abs(sunAltitude(LAT, LON, T).value! - 71.708953)).toBeLessThan(0.02);
  });
  it('азимут Солнца в пределах 0.01° от Horizons (178.077718°)', () => {
    expect(Math.abs(sunAzimuth(LAT, LON, T).value! - 178.077718)).toBeLessThan(0.01);
  });
  it('высота Луны в пределах 0.01° от Horizons APPARENT=REFRACTED (4.254328°)', () => {
    expect(Math.abs(moonAltitude(LAT, LON, T).value! - 4.254328)).toBeLessThan(0.01);
  });
});

import { skyBodies } from '../src/compute/planets';
import { sunSignAndConstellation } from '../src/compute/sign';
import { magneticInclination, magneticDeclination } from '../src/compute/magnetic';

describe('A4 14.09.2026 — планеты, созвездие, магнитное поле', () => {
  it('планеты: азимут Δ<0.01°, высота Δ<0.1° от Horizons', () => {
    const ref: Record<string, [number, number]> = { 'Меркурий': [124.871803, 60.016694], 'Венера': [107.821112, 47.828975], 'Марс': [244.907168, 50.991680], 'Юпитер': [118.982458, 56.698762], 'Сатурн': [262.926168, 12.702667] };
    for (const b of skyBodies(LAT, LON, T)) {
      const r = ref[b.name]; if (!r) continue;
      expect(Math.abs(b.az - r[0])).toBeLessThan(0.01);
      expect(Math.abs(b.alt - r[1])).toBeLessThan(0.1);
    }
  });
  it('созвездие Солнца совпадает с Horizons Q29 на 5 датах', () => {
    const ref: Array<[string, string]> = [['2026-01-15', 'Sagittarius'], ['2026-04-15', 'Pisces'], ['2026-07-15', 'Gemini'], ['2026-10-15', 'Virgo'], ['2026-12-05', 'Ophiuchus']];
    for (const [d, c] of ref) expect(sunSignAndConstellation(new Date(d + 'T12:00:00Z')).constellationLatin).toBe(c);
  });
  it('магнитное поле в пределах 0.05° от BGS WMM2025 (61.022° / 6.998°)', () => {
    expect(Math.abs(magneticInclination(LAT, LON, T).value! - 61.022)).toBeLessThan(0.05);
    expect(Math.abs(magneticDeclination(LAT, LON, T).value! - 6.998)).toBeLessThan(0.05);
  });
});
