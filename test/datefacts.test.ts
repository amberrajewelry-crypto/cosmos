import { describe, it, expect } from 'vitest';
import { dateFacts, activeShowers } from '../src/natal/datefacts';

describe('факты даты', () => {
  it('перигелий 3 января: ~0.983 а.е., ~30.3 км/с; афелий 4 июля: ~1.017 а.е., ~29.3 км/с', () => {
    const p = dateFacts(2024, 1, 3), a = dateFacts(2024, 7, 4);
    expect(p.distAu).toBeCloseTo(0.983, 2); expect(p.speedKms).toBeCloseTo(30.29, 1);
    expect(a.distAu).toBeCloseTo(1.017, 2); expect(a.speedKms).toBeCloseTo(29.29, 1);
  });
  it('склонение: равноденствие ~0°, солнцестояние ~23.4°', () => {
    expect(Math.abs(dateFacts(2024, 3, 20).dec)).toBeLessThan(0.5);
    expect(dateFacts(2024, 6, 21).dec).toBeCloseTo(23.4, 0);
  });
  it('окно созвездия: Солнце в Рыбах с ~12 марта по ~18 апреля (37±2 дня)', () => {
    const f = dateFacts(2024, 3, 14);
    expect(f.entered.getUTCMonth()).toBe(2); expect(f.entered.getUTCDate()).toBeGreaterThanOrEqual(11);
    expect(f.leaves.getUTCMonth()).toBe(3);
    expect(Math.abs(f.spanDays - 37)).toBeLessThanOrEqual(2);
  });
  it('метеоры: 12 августа — Персеиды; 1 января — Квадрантиды (окно через Новый год); 1 марта — никого', () => {
    expect(activeShowers(8, 12).map((s) => s.en)).toContain('Perseids');
    expect(activeShowers(1, 1).map((s) => s.en)).toContain('Quadrantids');
    expect(activeShowers(3, 1)).toEqual([]);
  });
});
