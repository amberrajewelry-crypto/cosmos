import { describe, it, expect } from 'vitest';
import { contentValues, VERIFIED } from '../src/registry/content';

// A4 (§3.8): эталоны сняты 15.09.2026 с JPL Horizons (геоцентр, 2026-09-14 12:00 UTC), BGS WMM2025 web service,
// Planck 2018 / PDG 2024. Числа зафиксированы здесь как регрессия: разошлось — тест красный, тег снимается.
const when = new Date('2026-09-14T12:00:00Z');
const ctx = { when, lat: 41.7, lon: 44.8, massKg: 70, heightM: 1.7, ageYears: 30, kp: 3 };
const v = (id: string) => contentValues(ctx).find((x) => x.id === id)!.value as number;
const AU = 149_597_870.7;

describe('A4 контент-базы против внешних эталонов', () => {
  it('Луна: дальность 0.00262010929 а.е. (Horizons) → 391 966 км; освещённость 12.50 %', () => {
    expect(v('c.hor.moon_dist')).toBeCloseTo(0.00262010929 * AU / 1000, -1); // ±5 тыс. км → фактически <1 тыс.
    expect(Math.abs(v('c.hor.moon_dist') - 391.966)).toBeLessThan(0.5);
    expect(Math.abs(v('c.hor.moon_phase') - 12.50)).toBeLessThanOrEqual(0.51); // движок 12.499 vs Horizons 12.504
  });
  it('Солнце: 1.00594359 а.е. (Horizons) → 150.49 млн км, свет 502 с', () => {
    expect(Math.abs(v('c.orb.sun_dist') - 1.00594359 * AU / 1e6)).toBeLessThan(0.01);
    expect(Math.abs(v('c.orb.light') - 501.96)).toBeLessThan(1);
  });
  it('Марс: 1.77216798 а.е. (Horizons) → 265 млн км', () => {
    expect(v('c.orb.mars')).toBe(Math.round(1.77216798 * AU / 1e6));
  });
  it('Скорость Земли: Horizons вектор (4.0029, 29.347) → 29.62 км/с', () => {
    expect(Math.abs(v('c.orb.speed') - Math.hypot(4.002908933878083, 29.34697959499026))).toBeLessThan(0.02);
  });
  it('|B| Тбилиси: BGS WMM2025 50 263 нТл', () => {
    expect(Math.abs(v('c.mag.f') - 50263)).toBeLessThan(5);
  });
  it('константы: T_CMB 2.7255 K (FIRAS), возраст 13.787 (Planck 2018), Проксима 4.246 св. лет (Gaia)', () => {
    expect(v('c.uni.cmb')).toBe(2.7255); expect(v('c.uni.age')).toBe(13.787); expect(v('c.gal.proxima')).toBe(4.246);
  });
  it('Тбилиси 14.09.2026: восход 02:40, транзит 08:57, заход 15:13 UTC (Horizons, REFRACTED, шаг 1 мин) → день 12.55 ч, полдень 08:56–08:57', () => {
    expect(Math.abs(v('c.hor.day') - 12.55)).toBeLessThanOrEqual(0.06);
    const noon = contentValues(ctx).find((x) => x.id === 'c.hor.noon')!.text!;
    const [h, m] = noon.split(' ')[0].split(':').map(Number);
    expect(Math.abs(h * 60 + m - (8 * 60 + 57))).toBeLessThanOrEqual(1);
  });
  it('g на 45°: WGS84 (NGA.STND.0036) 9.8061977 м/с²', () => {
    expect(contentValues({ ...ctx, lat: 45 }).find((x) => x.id === 'c.body.g')!.value).toBeCloseTo(9.8062, 4);
  });
  it('сверенные получают verified и могут носить [ТОЧНО]; остальные — нет', () => {
    const all = contentValues(ctx);
    for (const id of VERIFIED) expect(all.find((x) => x.id === id)!.verification).toBe('verified');
    expect(all.filter((x) => x.tag === 'ТОЧНО').every((x) => VERIFIED.has(x.id))).toBe(true);
    expect(all.filter((x) => !VERIFIED.has(x.id)).some((x) => x.tag === 'ТОЧНО')).toBe(false);
  });
});

describe('A4 проход 3: константы досье', () => {
  const ctx = { when: new Date('2026-09-14T12:00:00Z'), massKg: 70, heightM: 1.7, ageYears: 10 };
  const get = (id: string) => contentValues(ctx).find((x) => x.id === id)!;
  it('орбита за 10 лет = 9.4 млрд км (2π·а.е.·10)', () => { expect(get('c.orb.path').value).toBeCloseTo(2 * Math.PI * 149_597_870.7 * 10 / 1e9, 1); });
  it('Луна за 10 лет = 38 см (LLR 38.08 мм/год)', () => { expect(get('c.orb.moon_away').value).toBe(38); });
  it('распады: 7400 Бк × 10 лет ≈ 2.3·10¹²; сверенные помечены', () => {
    expect(get('c.nuc.decays_life').text).toBe('2.3·10¹²');
    for (const id of ['c.orb.path', 'c.orb.moon_away', 'c.nuc.decays_life', 'c.cell.heartbeats', 'c.gal.path']) expect(get(id).verification).toBe('verified');
  });
});
