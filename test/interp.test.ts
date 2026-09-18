import { describe, it, expect } from 'vitest';
import { reading, readingHtml } from '../src/natal/interp';
import { SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN } from '../src/natal/interp/signs';
import { MERCURY_IN_SIGN, VENUS_IN_SIGN, MARS_IN_SIGN, JUPITER_IN_SIGN, SATURN_IN_SIGN } from '../src/natal/interp/planets';
import { PLANET_IN_HOUSE, houseOf } from '../src/natal/interp/houses';
import { PAIRS } from '../src/natal/interp/aspects';

describe('разбор по классике', () => {
  it('все таблицы полные: 12 знаков, 12 домов, 21 пара', () => {
    for (const t of [SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN, MERCURY_IN_SIGN, VENUS_IN_SIGN, MARS_IN_SIGN, JUPITER_IN_SIGN, SATURN_IN_SIGN]) {
      expect(t).toHaveLength(12); t.forEach((d) => { expect(d.who.length).toBeGreaterThan(30); expect(d.advice.length).toBeGreaterThan(10); });
    }
    for (const k of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) expect(PLANET_IN_HOUSE[k]).toHaveLength(12);
    expect(Object.keys(PAIRS)).toHaveLength(21);
  });
  it('целознаковые дома от ASC', () => {
    expect(houseOf(205, 200)).toBe(1); expect(houseOf(185, 200)).toBe(1); expect(houseOf(175, 200)).toBe(12); expect(houseOf(5, 200)).toBe(7);
  });
  it('1990-05-15 11:30 UTC: Солнце в Тельце, без ASC — без домов, с ASC — дома', () => {
    const when = new Date('1990-05-15T11:30:00Z');
    const r = reading(when);
    expect(r.noTime).toBe(true);
    expect(r.blocks.find((b) => b.title.includes('Солнце'))!.title).toContain('Тельце');
    expect(r.blocks.some((b) => b.title.includes('доме'))).toBe(false);
    const r2 = reading(when, 205.3);
    expect(r2.blocks[0].title).toBe('Асцендент в Весах');
    expect(r2.blocks.filter((b) => b.title.includes('доме'))).toHaveLength(7);
    expect(r2.synthesis.length).toBeGreaterThanOrEqual(4);
    expect(readingHtml(when, 205.3)).toContain('[ТРАДИЦИЯ]');
  });
});
