// Приёмник обратной связи (§7): сообщение уходит в Telegram владельцу (трекер = чат),
// при отсутствии токена — 503, клиент падает на mailto. IP не сохраняем.
// 16.10: события сессии (kind=events) пишутся в Blob ev/<день>/<id>~<событие>~….json — без IP, даты рождения и cookies;
// GET /api/fb?days=N — воронка по дням (сессии с каждым событием). В Telegram события идут, только если Blob недоступен.
import { put, list } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
const evKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
async function storeEvents(fb) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  const keys = [...new Set(Object.keys(fb.counts ?? {}).map(evKey).filter(Boolean))].slice(0, 25).sort();
  if (!keys.length) return true;
  const day = new Date().toISOString().slice(0, 10);
  const path = `ev/${day}/${randomUUID().slice(0, 8)}~${keys.join('~')}.json`;
  try { await put(path, JSON.stringify({ counts: fb.counts, tz: fb.tz ?? '' }).slice(0, 4000), { access: 'private', addRandomSuffix: false, contentType: 'application/json' }); return true; }
  catch { return false; }
}
async function funnel(days) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), byDay = {}, total = { sessions: 0 };
  let cursor;
  do {
    const r = await list({ prefix: 'ev/', cursor, limit: 1000 });
    for (const b of r.blobs) {
      const m = /^ev\/(\d{4}-\d{2}-\d{2})\/[^~]+~(.*)\.json$/.exec(b.pathname);
      if (!m || m[1] < since) continue;
      const d = byDay[m[1]] ??= { sessions: 0 };
      d.sessions++; total.sessions++;
      for (const k of m[2].split('~')) { d[k] = (d[k] ?? 0) + 1; total[k] = (total[k] ?? 0) + 1; }
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return { days, total, byDay };
}
const KINDS = new Set(['wrong', 'clear', 'check', 'question', 'note', 'events']);
const MAX = 4000;
export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ ok: false }); return; }
    const days = Math.min(Math.max(parseInt(String(req.query?.days ?? '30'), 10) || 30, 1), 365);
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).json(await funnel(days)); return;
  }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX) { res.status(413).end(); return; }
  let fb; try { fb = JSON.parse(raw); } catch { res.status(400).end(); return; }
  if (!fb || !KINDS.has(fb.kind)) { res.status(400).end(); return; }
  if (fb.kind === 'events' && await storeEvents(fb)) { res.status(200).json({ ok: true }); return; }
  const token = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
  if (!token || !chat) { res.status(503).json({ ok: false }); return; }
  const lines = [`АСТРОАНАЛИЗ · ${fb.kind}${fb.id ? ' · ' + fb.id : ''}${fb.tz ? ' · ' + fb.tz : ''}`];
  for (const [k, v] of Object.entries(fb)) if (!['kind', 'id', 'tz'].includes(k)) lines.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 1500)}`);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: lines.join('\n').slice(0, 4000), disable_notification: fb.kind === 'events' }),
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
