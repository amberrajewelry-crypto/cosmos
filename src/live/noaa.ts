import type { Computed } from '../types';

// live/ слой (§3.2): async, кэш, НИКОГДА не бросает наружу — ошибка → value:null (слой гаснет).
// Источник: NOAA SWPC planetary K-index (публичный, CORS-открыт, без ключа). TTL 3ч (§3.6).
const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const TTL_MS = 3 * 60 * 60 * 1000;

let cache: { c: Computed; ts: number } | null = null;
let inflight: Promise<Computed> | null = null; // дедуп одновременных запросов

// Чистый парсер: последняя строка [time_tag, kp, ...] → число. Вынесен для теста.
export function parseKp(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const last = rows[rows.length - 1];
  if (!Array.isArray(last)) return null;
  const kp = Number(last[1]);
  return Number.isFinite(kp) ? kp : null;
}

export async function fetchKp(now: number = Date.now()): Promise<Computed> {
  if (cache && now - cache.ts < TTL_MS) return cache.c;
  if (inflight) return inflight;
  inflight = (async (): Promise<Computed> => {
    let value: number | null = null;
    try {
      const res = await fetch(KP_URL);
      value = parseKp(await res.json());
    } catch {
      value = null; // §3.2: наружу не бросаем, слой честно гаснет
    }
    const c: Computed = { id: 'live.kp', value, source: 'NOAA SWPC', computedAt: now };
    if (value != null) cache = { c, ts: now };
    return c;
  })();
  try { return await inflight; } finally { inflight = null; }
}
