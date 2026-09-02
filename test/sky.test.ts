import { describe, it, expect } from 'vitest';
import { sunAltitude } from '../src/compute/sky';

describe('sunAltitude — сырое число, тег отдаёт реестр', () => {
  it('Тбилиси, 05:00Z 21.06 — Солнце над горизонтом', () => {
    const before = Date.now();
    const c = sunAltitude(41.72, 44.79, new Date('2026-06-21T05:00:00Z'));
    expect(c.id).toBe('sky.sun.altitude');
    expect(c.value).not.toBeNull();
    expect(c.value!).toBeGreaterThan(0);                 // высота > 0 — инвариант знака
    expect(c.computedAt).toBeGreaterThanOrEqual(before); // время РАСЧЁТА (§3.9)
    // тег здесь НЕ проверяем — это ответственность registry
  });
});
