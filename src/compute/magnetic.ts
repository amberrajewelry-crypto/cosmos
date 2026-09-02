import geomagnetism from 'geomagnetism';
import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// #8 — магнитное наклонение/склонение в твоей точке (WMM). [ТОЧНО]-кандидат, A4 vs NOAA.
export function magneticInclination(lat: number, lon: number, when: Date): Computed {
  const p = geomagnetism.model(when).point([lat, lon]);
  return { id: 'magnetic.inclination', value: Math.round(p.incl * 100) / 100,
    source: 'WMM2025', computedAt: Date.now() };
}

export function magneticDeclination(lat: number, lon: number, when: Date): Computed {
  const p = geomagnetism.model(when).point([lat, lon]);
  return { id: 'magnetic.declination', value: Math.round(p.decl * 100) / 100,
    source: 'WMM2025', computedAt: Date.now() };
}

// #4 — солнечные нейтрино: поток ~глобален [ГЛОБ], но НАПРАВЛЕНИЕ зависит от высоты Солнца.
export function neutrinoFlux(lat: number, lon: number, when: Date): Computed {
  const obs = new Observer(lat, lon, 0);
  const eq = Equator(Body.Sun, when, obs, true, true);
  const sunAlt = Horizon(when, obs, eq.ra, eq.dec, 'normal').altitude;
  const text = sunAlt > 0
    ? 'Днём солнечные нейтрино входят со стороны Солнца — спереди/сверху.'
    : 'Ночью они прошивают тебя снизу — сквозь всю толщу Земли.';
  return { id: 'flux.neutrino', value: 6.5e10, source: 'солнечный поток ~6.5·10¹⁰ /см²/с',
    computedAt: Date.now(), text };
}
