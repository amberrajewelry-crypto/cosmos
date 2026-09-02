import { describe, it, expect } from 'vitest';
import { cmbVelocity, timeGradient, muonFlux } from '../src/compute/physics';
import { magneticInclination, magneticDeclination, neutrinoFlux } from '../src/compute/magnetic';

const TBILISI = [41.72, 44.79] as const;
const T = new Date('2026-06-21T09:00:00Z');

describe('physics/magnetic — параметры среза v1', () => {
  it('скорость относительно CMB = 370 км/с', () => {
    expect(cmbVelocity().value).toBe(370);
  });
  it('градиент времени ~6 нс/год (средний рост)', () => {
    const v = timeGradient(1.7).value!;
    expect(v).toBeGreaterThan(4); expect(v).toBeLessThan(8);
  });
  it('мюоны — положительный поток в минуту', () => {
    expect(muonFlux().value!).toBeGreaterThan(0);
  });
  it('магнитное наклонение в Тбилиси ~55–62°', () => {
    const v = magneticInclination(...TBILISI, T).value!;
    expect(v).toBeGreaterThan(50); expect(v).toBeLessThan(65);
  });
  it('магнитное склонение — конечное число', () => {
    expect(Number.isFinite(magneticDeclination(...TBILISI, T).value!)).toBe(true);
  });
  it('нейтрино: число потока + направление в text', () => {
    const c = neutrinoFlux(...TBILISI, T);
    expect(c.value!).toBeGreaterThan(0);
    expect(c.text).toMatch(/нейтрино|снизу|Солнц/);
  });
});
