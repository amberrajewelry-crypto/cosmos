import { describe, it, expect } from 'vitest';
import { sunAltitude, sunAzimuth, moonAltitude } from '../src/compute/sky';
import { shadowRatio } from '../src/compute/shadow';
import { constellationVsSign } from '../src/compute/sign';

const TBILISI = [41.72, 44.79] as const;
const MORNING = new Date('2026-06-21T05:00:00Z'); // 09:00 локального, Солнце на востоке

describe('sky/shadow/sign — сырые числа, тег отдаёт реестр', () => {
  it('высота Солнца > 0 утром', () => {
    const c = sunAltitude(...TBILISI, MORNING);
    expect(c.value!).toBeGreaterThan(0);
    expect(c.computedAt).toBeGreaterThan(0);
  });
  it('азимут Солнца в восточной половине (0..180) утром', () => {
    const c = sunAzimuth(...TBILISI, MORNING);
    expect(c.value!).toBeGreaterThan(0);
    expect(c.value!).toBeLessThan(180);
  });
  it('высота Луны — число в диапазоне -90..90', () => {
    const c = moonAltitude(...TBILISI, MORNING);
    expect(c.value!).toBeGreaterThanOrEqual(-90);
    expect(c.value!).toBeLessThanOrEqual(90);
  });
  it('тень: днём положительная доля, ночью null + text', () => {
    const day = shadowRatio(...TBILISI, MORNING);
    expect(day.value!).toBeGreaterThan(0);
    const night = shadowRatio(...TBILISI, new Date('2026-06-21T22:00:00Z'));
    expect(night.value).toBeNull();
    expect(night.text).toContain('тени нет');
  });
  it('созвездие vs знак — категориальный факт с text', () => {
    const c = constellationVsSign(MORNING);
    expect(c.value).toBeNull();
    expect(c.text).toMatch(/созвездии/);
  });
});
