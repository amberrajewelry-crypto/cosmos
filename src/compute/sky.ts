import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import type { Computed, LayerId } from '../types';

// Сырые числа неба (°) над горизонтом в точке пользователя. БЕЗ тега — тег из реестра (§1.6).
// ofdate=true, aberration=true — корректно для локального горизонта.
function bodyAltAz(body: Body, lat: number, lon: number, when: Date) {
  const obs = new Observer(lat, lon, 0);
  const eq = Equator(body, when, obs, true, true);
  return Horizon(when, obs, eq.ra, eq.dec, 'normal');
}

function altOf(id: LayerId, body: Body, lat: number, lon: number, when: Date): Computed {
  return { id, value: bodyAltAz(body, lat, lon, when).altitude, source: 'astronomy-engine', computedAt: Date.now() };
}

export function sunAltitude(lat: number, lon: number, when: Date): Computed {
  return altOf('sky.sun.altitude', Body.Sun, lat, lon, when);
}

export function sunAzimuth(lat: number, lon: number, when: Date): Computed {
  return { id: 'sky.sun.azimuth', value: bodyAltAz(Body.Sun, lat, lon, when).azimuth,
    source: 'astronomy-engine', computedAt: Date.now() };
}

export function moonAltitude(lat: number, lon: number, when: Date): Computed {
  return altOf('sky.moon.altitude', Body.Moon, lat, lon, when);
}
