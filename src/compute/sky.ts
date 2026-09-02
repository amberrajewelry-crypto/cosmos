import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// Сырое число высоты Солнца (°) над горизонтом. БЕЗ тега — тег присвоит реестр (§1.6).
// Точность сверяется с JPL Horizons в A4; до этого параметр unverified → показывается как [ОЦЕНКА].
export function sunAltitude(latDeg: number, lonDeg: number, when: Date): Computed {
  const obs = new Observer(latDeg, lonDeg, 0);
  const eq = Equator(Body.Sun, when, obs, true, true); // ofdate + aberration
  const hor = Horizon(when, obs, eq.ra, eq.dec, 'normal');
  return {
    id: 'sky.sun.altitude',
    value: hor.altitude,
    source: 'astronomy-engine',
    computedAt: Date.now(), // момент РАСЧЁТА, не наблюдения (§3.9)
  };
}
