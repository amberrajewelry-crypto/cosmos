// Приёмник обратной связи (§7): сообщение уходит в Telegram владельцу (трекер = чат),
// при отсутствии токена — 503, клиент падает на mailto. IP не сохраняем.
// 16.10: события сессии (kind=events) пишутся в Blob ev/<день>/<id>~<событие>~….json — без IP, даты рождения и cookies;
// GET /api/fb?days=N&key=… — воронка по дням (сессии с каждым событием). В Telegram события идут, только если Blob недоступен.
import { put, list, del } from '@vercel/blob';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
const evKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
// 16.10 (проверка безопасности): события — только объект из ≤25 счётчиков 1…500 и только со своего сайта.
const okCounts = (c) => c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length <= 25 &&
  Object.values(c).every((v) => Number.isInteger(v) && v >= 1 && v <= 500);
const okOrigin = (req) => { const o = String(req.headers?.origin ?? req.headers?.referer ?? '');
  return /^https:\/\/(www\.)?astropro\.tech(\/|$)/.test(o) || /^https:\/\/cosmos-[a-z0-9-]+\.vercel\.app(\/|$)/.test(o) || /^http:\/\/localhost(:\d+)?(\/|$)/.test(o); };
// Чтение воронки — по ключу, производному от токена Blob (отдельной переменной окружения не нужно).
const readKey = () => createHash('sha256').update('fb-funnel:' + (process.env.BLOB_READ_WRITE_TOKEN ?? '')).digest('hex').slice(0, 24);
const okKey = (k) => { const a = Buffer.from(String(k ?? '')), b = Buffer.from(readKey()); return a.length === b.length && timingSafeEqual(a, b); };
const BOT = /bot|crawl|spider|headless|lighthouse|playwright|puppeteer|preview|monitor/i;
async function storeEvents(fb, ua) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  if (BOT.test(ua)) return true; // боты и автотесты в воронку не пишем
  const keys = [...new Set(Object.keys(fb.counts).map(evKey).filter(Boolean))].slice(0, 25).sort();
  if (!keys.length) return true;
  const day = new Date().toISOString().slice(0, 10);
  // 16.10: одна сессия = один префикс ev/<день>/<sid>~; повторная отправка (сворачивание + уход) заменяет прежнюю запись.
  const sid = /^[0-9a-f]{8}$/.test(String(fb.sid ?? '')) ? fb.sid : randomUUID().slice(0, 8);
  const path = `ev/${day}/${sid}~${keys.join('~')}.json`;
  try {
    const old = (await list({ prefix: `ev/${day}/${sid}~`, limit: 10 })).blobs.filter((b) => b.pathname !== path);
    await put(path, JSON.stringify({ counts: fb.counts, tz: fb.tz ?? '' }).slice(0, 4000), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    if (old.length) await del(old.map((b) => b.url));
    return true;
  } catch { return false; }
}
async function funnel(days) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), byDay = {}, total = { sessions: 0 };
  // Только запрошенные дни (префикс ev/<день>/), не весь архив.
  for (let i = 0; i < days; i++) { const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
  let cursor;
  do {
    const r = await list({ prefix: `ev/${day}/`, cursor, limit: 1000 });
    for (const b of r.blobs) {
      const m = /^ev\/(\d{4}-\d{2}-\d{2})\/[^~]+~(.*)\.json$/.exec(b.pathname);
      if (!m || m[1] < since) continue;
      const d = byDay[m[1]] ??= { sessions: 0 };
      d.sessions++; total.sessions++;
      for (const k of m[2].split('~')) { d[k] = (d[k] ?? 0) + 1; total[k] = (total[k] ?? 0) + 1; }
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  }
  return { days, total, byDay };
}
// Частота по IP (17.10): сообщения в Telegram — 10 в час с адреса, события воронки — 300 в час. Память экземпляра (см. scripts/ratelimit.ts).
const rlHits = new Map();
const rlAllow = (scope, ip, max, win, now = Date.now()) => { const k = scope + '|' + ip, a = (rlHits.get(k) ?? []).filter((t) => now - t < win); if (a.length >= max) { rlHits.set(k, a); return false; } a.push(now); rlHits.set(k, a); if (rlHits.size > 5000) for (const [kk, ts] of rlHits) if (!ts.length || now - ts[ts.length - 1] > win) rlHits.delete(kk); return true; };
const rlIp = (h) => { const v = h?.['x-real-ip'] ?? h?.['x-forwarded-for']; return (Array.isArray(v) ? v[0] : v ?? '').split(',')[0].trim() || 'unknown'; };
const KINDS = new Set(['wrong', 'clear', 'check', 'question', 'note', 'events']);
const MAX = 4000;
export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) { res.status(503).json({ ok: false }); return; }
    if (!okKey(req.query?.key)) { res.status(403).json({ ok: false }); return; }
    const days = Math.min(Math.max(parseInt(String(req.query?.days ?? '30'), 10) || 30, 1), 90);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(await funnel(days)); return;
  }
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX) { res.status(413).end(); return; }
  let fb; try { fb = JSON.parse(raw); } catch { res.status(400).end(); return; }
  if (!fb || !KINDS.has(fb.kind)) { res.status(400).end(); return; }
  if (!rlAllow(fb.kind === 'events' ? 'ev' : 'tg', rlIp(req.headers), fb.kind === 'events' ? 300 : 10, 3600e3)) { res.status(429).json({ ok: false }); return; }
  if (fb.kind === 'events' && (!okCounts(fb.counts) || !okOrigin(req))) { res.status(400).end(); return; }
  if (fb.kind === 'events' && await storeEvents(fb, String(req.headers?.['user-agent'] ?? ''))) { res.status(200).json({ ok: true }); return; }
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
