import { GeoVector, Ecliptic, Body, SunPosition } from 'astronomy-engine';

// Геоцентрические эклиптические долготы даты (истинная эклиптика) — то, что стоит на настоящей
// натальной карте (§4.7). Не тег и не текст: сырые градусы, тег отдаёт реестр.
export interface NatalBody { key: string; glyph: string; name: string; lon: number; }

const BODIES: Array<[Body, string, string, string]> = [
  [Body.Moon, 'moon', '☽', 'Луна'], [Body.Mercury, 'mercury', '☿', 'Меркурий'], [Body.Venus, 'venus', '♀', 'Венера'],
  [Body.Mars, 'mars', '♂', 'Марс'], [Body.Jupiter, 'jupiter', '♃', 'Юпитер'], [Body.Saturn, 'saturn', '♄', 'Сатурн'],
];

export function natalBodies(when: Date): NatalBody[] {
  const out: NatalBody[] = [{ key: 'sun', glyph: '☉', name: 'Солнце', lon: SunPosition(when).elon }];
  for (const [b, key, glyph, name] of BODIES) {
    const lon = Ecliptic(GeoVector(b, when, true)).elon;
    out.push({ key, glyph, name, lon: ((lon % 360) + 360) % 360 });
  }
  return out;
}
