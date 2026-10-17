/**
 * Карточка «поделиться» 1080×1920 (Stories): тип человека, тон года, линия жизни, адрес с реферальной меткой ?r=.
 * Данные рождения в картинку и ссылку НЕ кладём — только ref-id браузера.
 */
import type { LifePoint } from './lifeline';

const REF_KEY = 'bazi-ref';
export function myRef(): string {
  try {
    let r = localStorage.getItem(REF_KEY);
    if (!r) { r = Math.random().toString(36).slice(2, 9); localStorage.setItem(REF_KEY, r); }
    return r;
  } catch { return 'x'; }
}
export const shareUrl = () => `${location.origin}/bazi?r=${myRef()}`;

/** Пришёл по чужой ссылке: вернуть ref один раз за сессию (для воронки). */
export function incomingRef(): string | null {
  const r = new URLSearchParams(location.search).get('r');
  if (!r || !/^[a-z0-9]{3,12}$/.test(r)) return null;
  try { if (r === localStorage.getItem(REF_KEY) || sessionStorage.getItem('bazi-ref-in')) return null; sessionStorage.setItem('bazi-ref-in', r); } catch { /* нет хранилища */ }
  return r;
}
export const cameByRef = () => { try { return !!sessionStorage.getItem('bazi-ref-in'); } catch { return false; } };

export type CardData = { title: string; year: number; yearTone: string; yearLine: string; pts: LifePoint[]; nowYear: number; color: string };

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 4): number {
  const words = text.split(/\s+/); let line = '', n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines - 1) break; } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

export async function renderCard(d: CardData): Promise<Blob> {
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#07061a'); bg.addColorStop(1, '#1a1440');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 700); glow.addColorStop(0, d.color + '55'); glow.addColorStop(1, '#0000');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e2c47c'; ctx.font = '500 44px system-ui, sans-serif';
  ctx.fillText('МОЯ КАРТА ПО БАЦЗЫ', W / 2, 220);
  ctx.fillStyle = '#fff'; ctx.font = '700 92px Georgia, serif';
  let y = wrap(ctx, d.title, W / 2, 420, 900, 110, 3);
  ctx.fillStyle = d.color; ctx.font = '600 58px system-ui, sans-serif';
  ctx.fillText(`${d.year}: ${d.yearTone}`, W / 2, y + 60);
  ctx.fillStyle = '#cfcbe8'; ctx.font = '400 42px system-ui, sans-serif';
  y = wrap(ctx, d.yearLine, W / 2, y + 150, 900, 58, 4);
  // линия жизни
  const top = Math.max(y + 140, 1160), gh = 360, gx = 90, gw = W - 180, mid = top + gh / 2;
  ctx.fillStyle = '#e2c47c'; ctx.font = '500 40px system-ui, sans-serif'; ctx.fillText('Линия жизни', W / 2, top - 100);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, mid); ctx.lineTo(gx + gw, mid); ctx.stroke();
  const px = (i: number) => gx + (i / Math.max(1, d.pts.length - 1)) * gw, py = (v: number) => mid - v * (gh / 2 - 20);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
  d.pts.forEach((p, i) => (i ? ctx.lineTo(px(i), py(p.v)) : ctx.moveTo(px(i), py(p.v)))); ctx.stroke();
  const ni = d.pts.findIndex((p) => p.year === d.nowYear);
  if (ni >= 0) { ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(px(ni), py(d.pts[ni].v), 18, 0, 7); ctx.fill(); const lx = Math.min(Math.max(px(ni), gx + 90), gx + gw - 90), ly = top - 70; ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(px(ni), py(d.pts[ni].v) - 20); ctx.lineTo(lx, ly + 52); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.roundRect(lx - 90, ly, 180, 52, 26); ctx.fill(); ctx.fillStyle = '#07061a'; ctx.font = '600 32px system-ui'; ctx.fillText('я сейчас', lx, ly + 37); }
  ctx.fillStyle = '#9a96b8'; ctx.font = '400 30px system-ui';
  ctx.fillText('0', gx, top + gh + 40); ctx.fillText('40', gx + gw / 2, top + gh + 40); ctx.fillText('80 лет', gx + gw - 30, top + gh + 40);
  ctx.fillStyle = '#fff'; ctx.font = '600 50px system-ui'; ctx.fillText('А какая линия у тебя?', W / 2, H - 230);
  ctx.fillStyle = '#e2c47c'; ctx.font = '500 46px system-ui'; ctx.fillText('astropro.tech/bazi', W / 2, H - 150);
  ctx.fillStyle = '#6f6b8f'; ctx.font = '400 26px system-ui'; ctx.fillText('Китайская традиция, не прогноз', W / 2, H - 90);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

export async function shareCard(d: CardData): Promise<'shared' | 'saved'> {
  const blob = await renderCard(d), file = new File([blob], 'moya-karta-bazi.png', { type: 'image/png' });
  const url = shareUrl();
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: `Моя линия жизни по бацзы. А у тебя? ${url}` }); return 'shared'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(url); } catch { /* нет доступа к буферу */ }
  return 'saved';
}
