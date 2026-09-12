import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// §2.3 #7: планеты над горизонтом в точке пользователя прямо сейчас (видимые невооружённым глазом).
// Число = сколько над горизонтом; text = какие и на какой высоте. Тег отдаёт реестр (§1.6).
const PLANETS: Array<[Body, string]> = [
  [Body.Mercury, 'Меркурий'], [Body.Venus, 'Венера'], [Body.Mars, 'Марс'],
  [Body.Jupiter, 'Юпитер'], [Body.Saturn, 'Сатурн'],
];

export interface SkyBody { name: string; glyph: string; alt: number; az: number; }
const GLYPH: Record<string, string> = { Меркурий: '☿', Венера: '♀', Марс: '♂', Юпитер: '♃', Сатурн: '♄' };

// Alt/az всех ярких тел для визуала горизонта (§2.3 #7 «визуален, не только число»).
export function skyBodies(lat: number, lon: number, when: Date): SkyBody[] {
  const obs = new Observer(lat, lon, 0);
  const all: Array<[Body, string, string]> = [[Body.Sun, 'Солнце', '☉'], [Body.Moon, 'Луна', '☽'], ...PLANETS.map(([b, n]) => [b, n, GLYPH[n]] as [Body, string, string])];
  return all.map(([body, name, glyph]) => {
    const eq = Equator(body, when, obs, true, true);
    const h = Horizon(when, obs, eq.ra, eq.dec, 'normal');
    return { name, glyph, alt: h.altitude, az: h.azimuth };
  });
}

export function planetsAbove(lat: number, lon: number, when: Date): Computed {
  const obs = new Observer(lat, lon, 0);
  const up: string[] = [];
  for (const [body, name] of PLANETS) {
    const eq = Equator(body, when, obs, true, true);
    const h = Horizon(when, obs, eq.ra, eq.dec, 'normal');
    if (h.altitude > 0) up.push(`${name} ${h.altitude.toFixed(0)}°`);
  }
  return {
    id: 'sky.planets.above', value: up.length, source: 'astronomy-engine', computedAt: Date.now(),
    text: up.length ? `Над горизонтом: ${up.join(', ')}.` : 'Сейчас все пять ярких планет под горизонтом.',
  };
}
