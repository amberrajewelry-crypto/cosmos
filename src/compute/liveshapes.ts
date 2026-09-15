// Живые данные для форм лестницы масштабов (§4.2): реальное небо над точкой пользователя
// и реальные гелиоцентрические позиции планет на сейчас.
import { Body, Ecliptic, HelioVector, SiderealTime } from 'astronomy-engine';
import type { StarCatalog } from '../data/stars';

const D2R = Math.PI / 180;

// RA/Dec (J2000, градусы) → alt/az через местное звёздное время; прецессия за 26 лет < 0.4°,
// для купола из точек это ниже разрешения.
export function starsAltAz(cat: StarCatalog, lat: number, lon: number, when: Date): Array<{ alt: number; az: number; mag: number }> {
  const lst = (SiderealTime(when) * 15 + lon) * D2R, phi = lat * D2R;
  return cat.stars.map(([, ra, dec, V]) => {
    const H = lst - ra * D2R, d = dec * D2R;
    const sinA = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(H);
    const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(H));
    return { alt: Math.asin(sinA) / D2R, az: ((az / D2R) + 360) % 360, mag: V };
  });
}

const PLANETS: Array<[Body, string]> = [[Body.Mercury, 'mercury'], [Body.Venus, 'venus'], [Body.Earth, 'earth'], [Body.Mars, 'mars']];

// Гелиоцентрические эклиптические x, y (а.е.) — плоскость орбиты, +x к точке весны.
export function helioPlanets(when: Date): Array<{ key: string; x: number; y: number }> {
  return PLANETS.map(([b, key]) => { const v = Ecliptic(HelioVector(b, when)).vec; return { key, x: v.x, y: v.y }; });
}
