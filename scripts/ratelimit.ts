// Ограничение частоты по IP для /api/* (17.10). Память экземпляра функции: Vercel переиспользует экземпляры (Fluid),
// поэтому один скрипт с одного адреса упирается в лимит; от сети ботов с разных IP не защищает — там нужен Vercel Firewall.
type Headers = Record<string, string | string[] | undefined> | undefined;
const hits = new Map<string, number[]>();

export function ipOf(h: Headers): string {
  const v = h?.['x-real-ip'] ?? h?.['x-forwarded-for'];
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? '').split(',')[0].trim() || 'unknown';
}

/** true — можно; false — превышен лимит: не больше max запросов за windowMs с одного IP по ключу scope. */
export function allow(scope: string, ip: string, max: number, windowMs: number, now = Date.now()): boolean {
  const k = scope + '|' + ip, arr = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(k, arr); return false; }
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) for (const [kk, ts] of hits) if (!ts.length || now - ts[ts.length - 1] > windowMs) hits.delete(kk); // не копить память
  return true;
}
