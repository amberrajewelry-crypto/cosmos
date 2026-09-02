import { describe, it, expect } from 'vitest';
import { reliktPhotons, ownRadioactivity, primordialHydrogenPercent } from '../src/compute/body';

describe('compute/body — параметры тела (средние, [ОЦЕНКА])', () => {
  it('реликтовые фотоны ~29 млн для 70 кг', () => {
    const c = reliktPhotons(70);
    expect(c.value!).toBeGreaterThan(2.5e7);
    expect(c.value!).toBeLessThan(3.2e7);
  });
  it('радиоактивность ~7000 расп/с для 70 кг', () => {
    const c = ownRadioactivity(70);
    expect(c.value!).toBeGreaterThan(6000);
    expect(c.value!).toBeLessThan(8000);
  });
  it('доля первичного водорода = 62% (по числу атомов)', () => {
    expect(primordialHydrogenPercent().value).toBe(62);
  });
});
