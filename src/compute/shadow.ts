import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// Длина тени как ДОЛЯ роста: L/h = 1/tan(высота Солнца). Не зависит от роста (нет 5-го входа) —
// значит настоящий [ТОЧНО]-кандидат. Проверяемость: §2.3 #10 (тень линейкой).
export function shadowRatio(lat: number, lon: number, when: Date): Computed {
  const obs = new Observer(lat, lon, 0);
  const eq = Equator(Body.Sun, when, obs, true, true);
  const alt = Horizon(when, obs, eq.ra, eq.dec, 'normal').altitude;
  if (alt <= 0) {
    return { id: 'shadow.length', value: null, source: 'astronomy-engine',
      computedAt: Date.now(), text: 'Солнце под горизонтом — тени нет.' };
  }
  const ratio = 1 / Math.tan((alt * Math.PI) / 180);
  return { id: 'shadow.length', value: Math.round(ratio * 100) / 100, source: 'astronomy-engine', computedAt: Date.now() };
}
