import { describe, it, expect } from 'vitest';
import { sunAltitude, sunAzimuth } from '../src/compute/sky';

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
});
