import type { Computed } from '../types';

// Накопленный сдвиг прецессии (аянамша): на столько тропический зодиак разошёлся с реальными
// созвездиями. ~50.3″/год = 0.01397°/год; на J2000 ≈ 23.86° (Lahiri). §4.8 — ~24° за 2000 лет.
const RATE_DEG_PER_YEAR = 0.01397;
const AYANAMSA_J2000 = 23.86;

export function precessionOffsetDeg(when: Date): number {
  const year = when.getUTCFullYear() + when.getUTCMonth() / 12;
  return Math.round((AYANAMSA_J2000 + RATE_DEG_PER_YEAR * (year - 2000)) * 100) / 100;
}

export function precessionOffset(when: Date): Computed {
  return { id: 'stars.birthyear', value: precessionOffsetDeg(when), source: 'прецессия 50.3″/год',
    computedAt: Date.now(), text: 'На столько круг знаков разошёлся с реальными созвездиями с твоего рождения.' };
}
