// База мест рождения: GeoNames cities15000 (CC BY 4.0) → города ≥100k, все столицы,
// русскоязычные страны ≥30k; русские имена из alternateNamesV2 (lang=ru). 7 204 записи, 456 КБ.
// Загружается лениво при фокусе поля; поиск целиком в браузере — место не покидает устройство (§3.7).
export type Place = { name: string; ru: string; lat: number; lon: number; tz: string; cc: string };
type Row = [string, string, number, number, string, string];

let cache: Place[] | null = null;
let loading: Promise<Place[]> | null = null;

export async function loadPlaces(url = '/cities.json'): Promise<Place[]> {
  if (cache) return cache;
  if (!loading) loading = fetch(url).then((r) => r.json()).then((rows: Row[]) => {
    cache = rows.map(([name, ru, lat, lon, tz, cc]) => ({ name, ru, lat, lon, tz, cc }));
    return cache;
  });
  return loading;
}

const fold = (s: string): string => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, '');

// Поиск по префиксу слова (русское или латинское имя); список уже отсортирован по населению.
export function searchPlaces(places: Place[], q: string, limit = 8): Place[] {
  const f = fold(q).trim();
  if (f.length < 2) return [];
  const out: Place[] = [];
  for (const p of places) {
    const ru = fold(p.ru), en = fold(p.name);
    if (ru.startsWith(f) || en.startsWith(f) || ru.includes(' ' + f) || en.includes(' ' + f)) { out.push(p); if (out.length >= limit) break; }
  }
  return out;
}

export const placeLabel = (p: Place): string => `${p.ru || p.name}, ${p.cc}`;
