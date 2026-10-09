// /bazi/zastavka.png?d=…&t=…&p=lat,lon,tz,место&g=m|f[&z=текущий пояс] — заставка «карта дня» для iPhone (1179×2556).
// Команды iOS: «Получить содержимое URL» → «Установить обои». День берётся по поясу z (по умолчанию — пояс рождения).
import resvgPkg from '@resvg/resvg-js';
import { writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { daysFrom } from '../src/bazi/days';
import { applyHypo, decodeSet } from '../src/bazi/calibrate';
import { wallpaperSvg, tzOffsetH } from '../src/bazi/wallpaper';
import f400 from '../src/bazi/fonts/Manrope-400.ttf';
import f600 from '../src/bazi/fonts/Manrope-600.ttf';
import f800 from '../src/bazi/fonts/Manrope-800.ttf';
import fc600 from '../src/bazi/fonts/Cormorant-600.ttf';

const { Resvg } = resvgPkg as unknown as typeof import('@resvg/resvg-js');
interface Req { query: Record<string, string | string[] | undefined>; }
interface Res { setHeader(k: string, v: string): Res; status(n: number): Res; send(b: string | Buffer): void; }

// resvg-js 2.6 читает шрифты только с диска: вшитые в бандл TTF кладём во /tmp при холодном старте.
let fontFiles: string[] | null = null;
const fonts = () => fontFiles ??= ([[400, f400], [600, f600], [800, f800], ['c600', fc600]] as const).map(([w, b]) => {
  const f = join(tmpdir(), `zastavka-font-${w}.ttf`); if (!existsSync(f)) writeFileSync(f, b); return f; });

const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

export function render(q: Record<string, string>, now = new Date()): Buffer | null {
  const d = q.d ?? '', [lat, lon, tz, ...name] = (q.p ?? '').split(','), t = q.t ?? '12:00';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !(t === '-' || /^\d{2}:\d{2}$/.test(t)) || !isFinite(+lat) || !isFinite(+lon) || !tz || !validTz(tz)) return null;
  const z = q.z && validTz(q.z) ? q.z : tz;
  const c = computeChart({ date: d, time: t === '-' ? '12:00' : t, timeKnown: t !== '-', tz, lat: +lat, lon: +lon, male: q.g !== 'f', place: name.join(',') }, DEFAULT_VARIANT);
  const a = analyze(c);
  // u — расклад, перестроенный сверкой с жизнью на сайте (calibrate.ts).
  const u = decodeSet(q.u); if (u) applyHypo(a, u);
  const [Y, M, D] = new Intl.DateTimeFormat('en-CA', { timeZone: z }).format(now).split('-').map(Number);
  const days = daysFrom(c, a, new Date(Y, M - 1, D), 9);
  const shift = z === tz ? tzOffsetH(z, now) - +lon / 15 : 0;
  const svg = wallpaperSvg(a, days[0], days, shift);
  const png = new Resvg(svg, { font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: 'Manrope' } }).render().asPng();
  return Buffer.from(png);
}

export default function handler(req: Req, res: Res): void {
  const png = render(req.query as Record<string, string>);
  if (!png) { res.status(400).setHeader('Cache-Control', 'no-store'); res.send('bad params'); return; }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800'); // день меняется в полночь — кэш CDN 30 мин
  res.send(png);
}
