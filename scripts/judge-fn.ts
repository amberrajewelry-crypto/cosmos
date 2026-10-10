// Вторая проверка полезного бога («судья»): очередь в Vercel Blob, разбирает воркер на VPS (claude -p, подписка).
// Ключ — четыре столпа (индексы 0–59: год_месяц_день_час). Запрос: jq/<key>.txt; ответ: jr/<key>/<стихия 0–4 | x>.txt.
// Содержимое файлов не читается — всё в имени пути (хранилище приватное).
import { put, list } from '@vercel/blob';

type Req = { method?: string; query?: Record<string, string | string[]>; body?: unknown };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

const KEY = /^([0-5]?\d)_([0-5]?\d)_([0-5]?\d)_([0-5]?\d)$/;
const MAX_QUEUE = 300;

const keyOf = (v: unknown): string | null => {
  const m = typeof v === 'string' ? KEY.exec(v) : null;
  if (!m) return null;
  const n = m.slice(1).map(Number);
  return n.every((x) => x >= 0 && x < 60) ? n.join('_') : null;
};

async function result(key: string): Promise<number | 'x' | null> {
  const b = (await list({ prefix: `jr/${key}/`, limit: 5 })).blobs[0];
  if (!b) return null;
  const m = /\/([0-4x])\.txt$/.exec(b.pathname);
  return !m ? null : m[1] === 'x' ? 'x' : Number(m[1]);
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ ok: false }); return; }
  res.setHeader('Cache-Control', 'no-store');
  let raw: unknown = req.query?.p;
  if (req.method === 'POST') {
    try { const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) ?? {}; raw = b.p; } catch { res.status(400).end(); return; }
  } else if (req.method !== 'GET') { res.status(405).end(); return; }
  const key = keyOf(Array.isArray(raw) ? raw[0] : raw);
  if (!key) { res.status(400).json({ ok: false }); return; }

  const r = await result(key);
  if (r !== null) { res.status(200).json({ ok: true, status: 'done', el: r === 'x' ? null : r }); return; }
  const queued = (await list({ prefix: `jq/${key}.txt`, limit: 1 })).blobs.length > 0;
  if (queued || req.method === 'GET') { res.status(200).json({ ok: true, status: queued ? 'queued' : 'none' }); return; }
  if ((await list({ prefix: 'jq/', limit: MAX_QUEUE })).blobs.length >= MAX_QUEUE) { res.status(200).json({ ok: true, status: 'busy' }); return; }
  await put(`jq/${key}.txt`, '1', { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
  res.status(200).json({ ok: true, status: 'queued' });
}
