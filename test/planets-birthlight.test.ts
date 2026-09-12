import { describe, it, expect } from 'vitest';
import { planetsAbove } from '../src/compute/planets';
import { birthLightStar } from '../src/compute/birthlight';

describe('планеты над горизонтом (§2.3 #7)', () => {
  it('число 0..5 и текст согласован с числом', () => {
    const c = planetsAbove(41.72, 44.79, new Date('2026-06-21T05:00:00Z'));
    expect(c.value).toBeGreaterThanOrEqual(0);
    expect(c.value).toBeLessThanOrEqual(5);
    expect(c.text!.split(',').length >= (c.value as number) || c.value === 0).toBe(true);
  });
});

describe('звезда года рождения (§2.3 #12)', () => {
  it('30 лет → Поллукс 33.8 или Арктур 36.7 — ближайшая по расстоянию', () => {
    const c = birthLightStar(new Date('1996-01-01'), new Date('2026-01-01'));
    expect(c.text).toContain('Поллукс');
    expect(c.text).toContain('до твоего рождения');
  });
  it('26 лет → Вега/Фомальгаут, свет вышел до рождения; 9 лет → Сириус, после', () => {
    expect(birthLightStar(new Date('2000-01-01'), new Date('2026-01-01')).text).toMatch(/Вега|Фомальгаут/);
    expect(birthLightStar(new Date('2017-01-01'), new Date('2026-01-01')).text).toContain('Сириус');
  });
});
