// /api/journal — журнал «день совпал?» (проверка прогноза дня на реальных людях, KB 17 §5 п.7).
// POST {h, iso, type, score, ans, sphere?, luck?, year?, conf?} → запись в приватный Vercel Blob.
// GET → сводка: доля «да» по типу дня и по оценке. Дата рождения не передаётся: h — хэш карты в браузере.
// Все данные записи — в имени файла (статистика = только list, без чтения файлов); один ответ на карту и день.
import { put, list, del } from '@vercel/blob';

interface Req { method?: string; body?: unknown; query: Record<string, string | string[] | undefined> }
interface Res { setHeader(k: string, v: string): Res; status(n: number): Res; json(b: unknown): void; end(): void }

const TYPES = new Set(['peak', 'peak-hit', 'calm', 'heavy']);
const TONES = new Set(['good', 'bad', 'mixed', 'calm', '-']);
const SPH = new Set(['-', 'work', 'money', 'love', 'health', 'mood', 'family']);
const ok = (re: RegExp, v: unknown): v is string => typeof v === 'string' && re.test(v);

export function recordPath(r: Record<string, unknown>): string | null {
  const { h, iso, type, score, ans } = r;
  const luck = String(r.luck ?? '-'), year = String(r.year ?? '-'), conf = String(r.conf ?? '-'), sphere = String(r.sphere ?? '-');
  if (!ok(/^[a-f0-9]{16}$/, h) || !ok(/^\d{4}-\d{2}-\d{2}$/, iso) || !TYPES.has(String(type))) return null;
  if (![1, 2, 3, 4, 5].includes(Number(score)) || ![0, 1].includes(Number(ans))) return null;
  if (!TONES.has(luck) || !TONES.has(year) || !SPH.has(sphere) || !/^(mid|low|vlow|-)$/.test(conf)) return null;
  // ответ только про сегодня или прошлые 7 дней (пояс ±1 день)
  const dd = (Date.parse(`${iso}T12:00:00Z`) - Date.now()) / 864e5;
  if (!(dd <= 1.5 && dd >= -8)) return null;
  return `j/${h}/${iso}/${type}_${score}_${ans}_${luck}_${year}_${conf}_${sphere}.txt`;
}

export function aggregate(paths: string[]) {
  const by = (k: string) => ({ k, n: 0, yes: 0 });
  const type: Record<string, ReturnType<typeof by>> = {}, score: Record<string, ReturnType<typeof by>> = {};
  const people = new Set<string>();
  for (const p of paths) {
    const m = /^j\/([a-f0-9]{16})\/[\d-]+\/([a-z-]+)_(\d)_([01])_/.exec(p); if (!m) continue;
    people.add(m[1]);
    const t = (type[m[2]] ??= by(m[2])), s = (score[m[3]] ??= by(m[3]));
    t.n++; s.n++; if (m[4] === '1') { t.yes++; s.yes++; }
  }
  return { answers: paths.length, people: people.size, type, score };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ ok: false }); return; }
  if (req.method === 'GET') {
    const paths: string[] = [];
    let cursor: string | undefined;
    do { const r = await list({ prefix: 'j/', cursor, limit: 1000 }); paths.push(...r.blobs.map((b) => b.pathname)); cursor = r.hasMore ? r.cursor : undefined; } while (cursor && paths.length < 20000);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(aggregate(paths)); return;
  }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  let body: Record<string, unknown>;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) ?? {}; } catch { res.status(400).end(); return; }
  const path = recordPath(body);
  if (!path) { res.status(400).json({ ok: false }); return; }
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const old = (await list({ prefix: dir })).blobs.map((b) => b.url);
  if (old.length) await del(old);
  await put(path, '1', { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
}
