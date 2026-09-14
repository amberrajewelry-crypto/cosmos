// Каталог ярких звёзд (SIMBAD, V<4.6, HIP) + линии созвездий (Stellarium modern). Грузится лениво (§3.7 — только по действию).
export type Star = [hip: number, ra: number, dec: number, V: number, plxMas: number, name: string];
export interface StarCatalog {
  source: string; epoch: string; stars: Star[];
  constellations: Record<string, { ru: string; lines: number[][] }>;
}
let cache: Promise<StarCatalog> | null = null;
export function loadStars(url = '/stars.json'): Promise<StarCatalog> {
  return (cache ??= fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }));
}

const OBL = (23.4392911 * Math.PI) / 180; // J2000 obliquity
// RA/Dec J2000 → ecliptic lon/lat (deg). Precession to date: +0.01397°/yr on lon (enough for a 400px chart).
export function toEcliptic(raDeg: number, decDeg: number, year = 2000): [lon: number, lat: number] {
  const ra = (raDeg * Math.PI) / 180, dec = (decDeg * Math.PI) / 180;
  const sb = Math.sin(dec) * Math.cos(OBL) - Math.cos(dec) * Math.sin(OBL) * Math.sin(ra);
  const y = Math.sin(ra) * Math.cos(OBL) + Math.tan(dec) * Math.sin(OBL);
  let lon = (Math.atan2(y, Math.cos(ra)) * 180) / Math.PI + 0.01397 * (year - 2000);
  lon = ((lon % 360) + 360) % 360;
  return [lon, (Math.asin(sb) * 180) / Math.PI];
}

export const ZODIAC13 = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Oph', 'Sgr', 'Cap', 'Aqr', 'Psc'];
// Полилинии зодиакальных созвездий в эклиптических координатах даты.
export function zodiacLines(cat: StarCatalog, year: number): Array<Array<[number, number]>> {
  const byHip = new Map(cat.stars.map((s) => [s[0], s]));
  const out: Array<Array<[number, number]>> = [];
  for (const ab of ZODIAC13) {
    for (const line of cat.constellations[ab]?.lines ?? []) {
      const pts = line.map((h) => byHip.get(h)).filter((s): s is Star => !!s).map((s) => toEcliptic(s[1], s[2], year));
      if (pts.length > 1) out.push(pts);
    }
  }
  return out;
}

const LY_PER_MAS = 3261.56;
// Именованная звезда, чей свет вышел ближе всего к возрасту (лет). Параллакс → расстояние.
export function nearestLightStar(cat: StarCatalog, ageYears: number): { name: string; ly: number } | null {
  let best: { name: string; ly: number } | null = null;
  for (const s of cat.stars) {
    if (!s[5] || s[4] <= 0) continue;
    const ly = LY_PER_MAS / s[4];
    if (!best || Math.abs(ly - ageYears) < Math.abs(best.ly - ageYears)) best = { name: s[5], ly };
  }
  return best;
}
