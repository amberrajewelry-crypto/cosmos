// Приёмник обратной связи (§7). Хранилища нет: сообщение уходит в Telegram владельцу (трекер = чат),
// при отсутствии токена — 503, клиент падает на mailto. Ничего не логируем, IP не сохраняем.
const KINDS = new Set(['wrong', 'clear', 'check', 'question', 'note', 'events']);
const MAX = 4000;
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX) { res.status(413).end(); return; }
  let fb; try { fb = JSON.parse(raw); } catch { res.status(400).end(); return; }
  if (!fb || !KINDS.has(fb.kind)) { res.status(400).end(); return; }
  const token = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
  if (!token || !chat) { res.status(503).json({ ok: false }); return; }
  const lines = [`COSMOS · ${fb.kind}${fb.id ? ' · ' + fb.id : ''}${fb.tz ? ' · ' + fb.tz : ''}`];
  for (const [k, v] of Object.entries(fb)) if (!['kind', 'id', 'tz'].includes(k)) lines.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 1500)}`);
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: lines.join('\n').slice(0, 4000), disable_notification: fb.kind === 'events' }),
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
