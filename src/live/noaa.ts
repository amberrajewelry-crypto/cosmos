import type { Computed } from '../types';

// live/ слой (§3.2): async, кэш, НИКОГДА не бросает наружу — ошибка → value:null (слой гаснет).
// Источник: официальный Kp GFZ Potsdam через наш прокси /api/kp (A4: NOAA estimated расходится
// с GFZ до 0.7 балла); fallback — NOAA SWPC напрямую (CORS-открыт). TTL 3ч (§3.6).
const GFZ_PROXY = '/api/kp';
const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const TTL_MS = 3 * 60 * 60 * 1000;

let cache: { c: Computed; ts: number } | null = null;
let inflight: Promise<Computed> | null = null; // дедуп одновременных запросов

// Чистый парсер последней записи → число Kp. NOAA отдаёт массив объектов
// {time_tag, Kp, ...}; исторический формат — массив массивов [time, kp, ...]. Держим оба.
export function parseKp(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length < 1) return null;
  const last = rows[rows.length - 1];
  let kp: number;
  if (Array.isArray(last)) kp = Number(last[1]);
  else if (last && typeof last === 'object') kp = Number((last as Record<string, unknown>).Kp ?? (last as Record<string, unknown>).kp);
  else return null;
  return Number.isFinite(kp) ? kp : null;
}

export async function fetchKp(now: number = Date.now()): Promise<Computed> {
  if (cache && now - cache.ts < TTL_MS) return cache.c;
  if (inflight) return inflight;
  inflight = (async (): Promise<Computed> => {
    let value: number | null = null;
    let source = 'GFZ Potsdam';
    try {
      const g = await (await fetch(GFZ_PROXY)).json() as { kp?: unknown };
      value = typeof g.kp === 'number' && Number.isFinite(g.kp) ? g.kp : null;
    } catch { value = null; }
    if (value == null) {
      source = 'NOAA SWPC';
      try {
        const res = await fetch(KP_URL);
        value = parseKp(await res.json());
      } catch {
        value = null; // §3.2: наружу не бросаем, слой честно гаснет
      }
    }
    const c: Computed = { id: 'live.kp', value, source, computedAt: now };
    if (value != null) cache = { c, ts: now };
    return c;
  })();
  try { return await inflight; } finally { inflight = null; }
}
