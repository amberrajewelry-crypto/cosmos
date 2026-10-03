// База мест рождения: GeoNames (CC BY 4.0) — 549 тыс. населённых пунктов мира: cities500 + все сёла СНГ/Балтии.
// Русские имена, регион и район, исторические имена (Ленинград, Свердловск, Фрунзе…) — scripts/build-places.py.
// Ядро /places/core.json (крупные города + справочники) грузится при фокусе поля; остальное — шардами
// по первым буквам слова (/places/<ver>/<hex>.json, scripts/gen-places.mjs). Поиск в браузере — место не покидает устройство (§3.7).
export type Place = {
  name: string; ru: string; lat: number; lon: number; tz: string; cc: string;
  region?: string; district?: string; country?: string; pop?: number;
  aliases?: string[]; alias?: string; // alias — историческое имя, по которому нашли
};
type Row = [string, string, number, number, number, string, number?, string?, number?, string[]?, string?];
type Core = { v: string; count: number; split: string[]; tz: string[]; reg: string[]; countries: Record<string, string>; rows: Row[] };

export const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[-‐–—/.,()]/g, ' ')
  .replace(/[^a-zа-я0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// Кириллица → латиница (как в GeoNames/BGN): для сёл без русского имени в базе.
const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ў: 'u' };
export function translit(s: string): string[] {
  const low = s.toLowerCase();
  if (!/[а-яёіїєґў]/.test(low)) return [];
  const a = [...low].map((c) => TR[c] ?? c).join('');
  const b = low.replace(/(^|[\s-аеёиоуыэюяьъ])е/g, '$1ye').replace(/ё/g, 'yo');
  const bb = [...b].map((c) => TR[c] ?? c).join('');
  return [...new Set([fold(a), fold(bb)])];
}

let core: Core | null = null;
let cache: Place[] | null = null;
let loading: Promise<Place[]> | null = null;
const shards = new Map<string, Promise<Place[]>>();

const toPlace = (c: Core, r: Row): Place => {
  const [name, ru, lat, lon, tzI, cc, regI, district, pop, aliases] = r;
  const region = regI === undefined ? '' : c.reg[regI];
  return { name, ru, lat, lon, tz: c.tz[tzI], cc, region, district: district || '', country: c.countries[cc] || cc, pop: pop || 0, aliases: aliases || [] };
};

/** Ядро базы (крупные города). Совместимо со старым API: сразу пригодно для searchPlaces/matchSpokenPlace. */
export async function loadPlaces(url = '/places/core.json'): Promise<Place[]> {
  if (cache) return cache;
  if (!loading) loading = fetch(url).then((r) => r.json()).then((c: Core) => {
    core = c;
    cache = c.rows.map((r) => toPlace(c, r));
    return cache;
  });
  return loading;
}

const hex = (k: string): string => [...new TextEncoder().encode(k)].map((b) => b.toString(16).padStart(2, '0')).join('');
const shardKey = (w: string, split: string[]): string => (w.length >= 3 && split.includes(w.slice(0, 2)) ? w.slice(0, 3) : w.slice(0, 2));

function loadShard(key: string): Promise<Place[]> {
  const c = core!;
  let p = shards.get(key);
  if (!p) {
    p = fetch(`/places/${c.v}/${hex(key)}.json`).then((r) => (r.ok ? r.json() : [])).then((rows: Row[]) => rows.map((r) => toPlace(c, r))).catch(() => []);
    shards.set(key, p);
  }
  return p;
}

// Ранг совпадения: 0 — имя целиком, 1 — историческое имя целиком, 2/3 — начало имени, 4/5 — начало слова; -1 — нет.
function rank(p: Place, qs: string[]): { r: number; alias?: string } {
  let best = -1, alias: string | undefined;
  const test = (n: string, base: number, a?: string) => {
    const f = fold(n);
    if (!f) return;
    for (const q of qs) {
      const r = f === q ? base : f.startsWith(q) ? base + 2 : f.includes(' ' + q) ? base + 4 : -1;
      if (r >= 0 && (best < 0 || r < best)) { best = r; alias = a; }
    }
  };
  test(p.ru, 0); test(p.name, 0);
  for (const a of p.aliases || []) test(a, 1, a);
  return { r: best, alias: best % 2 === 1 ? alias : undefined };
}

const NEAR = new Set(['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'MD', 'TM', 'LV', 'LT', 'EE']);

function pick(list: Place[], qs: string[], limit: number): Place[] {
  const seen = new Set<string>();
  const hits: { p: Place; r: number }[] = [];
  for (const p of list) {
    const k = `${p.ru || p.name}|${p.region}|${p.district}|${Math.round(p.lat * 10)},${Math.round(p.lon * 10)}`; // дубли GeoNames (город и его центр)
    if (seen.has(k)) continue;
    const { r, alias } = rank(p, qs);
    if (r < 0) continue;
    seen.add(k);
    hits.push({ p: alias ? { ...p, alias } : p, r });
  }
  // вес = порядок населения + 1.5 за точное имя + 0.5 за СНГ (в т.ч. историческое): «алма» → Алматы, а не канадская Алма на 29 тыс.
  const w = (h: { p: Place; r: number }): number =>
    Math.log10((h.p.pop || 0) + 10) + (h.r <= 1 ? 1.5 : 0) - (h.r >= 4 ? 0.5 : 0) + (NEAR.has(h.p.cc) ? 0.5 : 0);
  hits.sort((a, b) => w(b) - w(a));
  return hits.slice(0, limit).map((h) => h.p);
}

const queries = (q: string): string[] => {
  const f = fold(q);
  return f.length < 2 ? [] : [...new Set([f, ...translit(q)])];
};

/** Синхронный поиск по уже загруженному списку (ядро) — по префиксу слова, русскому или латинскому. */
export function searchPlaces(places: Place[], q: string, limit = 8): Place[] {
  const qs = queries(q);
  return qs.length ? pick(places, qs, limit) : [];
}

/** Полный поиск: ядро + шарды всей базы (все города и сёла). */
export async function findPlaces(q: string, limit = 8): Promise<Place[]> {
  const base = await loadPlaces();
  const qs = queries(q);
  if (!qs.length) return [];
  const keys = [...new Set(qs.map((x) => shardKey(x.split(' ')[0], core!.split)).filter((k) => k.length >= 2))];
  const parts = await Promise.all(keys.map(loadShard));
  return pick([...base, ...parts.flat()], qs, limit);
}

const uniq = (xs: (string | undefined)[], name: string): string[] => {
  const out: string[] = [];
  for (const x of xs) if (x && x !== name && !out.includes(x)) out.push(x);
  return out;
};

/** Подпись в поле: «Кутаиси, Имеретия, Грузия»; старые записи без региона — «Кутаиси, GE». */
export const placeLabel = (p: Place): string => {
  const name = p.ru || p.name;
  return [name + (p.alias ? ` (${p.alias})` : ''), ...uniq([p.region, p.country || p.cc], name)].join(', ');
};

/** Подробная подпись для списка: с районом — различает одноимённые сёла. */
const CYRX = /[а-яё]/i;
export const placeDetail = (p: Place): string =>
  uniq([p.district && CYRX.test(p.district) ? p.district : '', p.region, p.country || p.cc], p.ru || p.name).join(', ');
