// Заставка телефона «карта дня» (SVG → PNG в api/zastavka). Чистая функция: день + часы → SVG.
// Верх ~35% оставлен под часы экрана блокировки, низ — под кнопки фонарика/камеры.
import { bestHours, type DayInfo } from './days';
import type { Analysis } from './calc';

export const WP = { w: 1179, h: 2556 };
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WDF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const ACC: Record<number, string> = { 1: '#d6604f', 2: '#e2964f', 3: '#dcc878', 4: '#8cc882', 5: '#6ec8aa' };
const HEAD: Record<DayInfo['type'], string> = { peak: 'Сильный день', 'peak-hit': 'Сильный, но с риском', calm: 'Ровный день', heavy: 'День нагрузки' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const label = (iso: string, wd = false) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]}${wd ? ', ' + WDF[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] : ''}`; };

/** Перенос по ширине: средняя ширина знака Manrope ≈ 0.56 кегля. */
export function wrap(text: string, size: number, width: number, max = 4): string[] {
  const per = Math.floor(width / (size * 0.56)), out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= per || !cur) cur = t; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/[\s,;:—-]*\S*$/, '') + '…'; }
  return out;
}

/** Сдвиг часов на руке от солнечного времени (как в ui.clockShift): человек в поясе рождения — по долготе, иначе 0. */
export function tzOffsetH(tz: string, at = new Date()): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(at).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(at.getTime() / 6e4) * 6e4) / 36e5 * 4) / 4;
}

export function wallpaperSvg(a: Analysis, d: DayInfo, days: DayInfo[], shift: number): string {
  const { w, h } = WP, X = 92, TW = w - 2 * X, acc = ACC[d.score] ?? ACC[3];
  const t: string[] = [];
  let y = 905;
  const text = (s: string, size: number, weight: number, fill: string, yy = y) =>
    t.push(`<text x="${X}" y="${yy}" font-family="Manrope" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(s)}</text>`);

  text(cap(label(d.iso, true)), 46, 600, '#c8cdd7'); y += 92;
  for (let i = 0; i < 5; i++) t.push(`<circle cx="${X + 24 + i * 68}" cy="${y - 16}" r="22" fill="${i < d.score ? acc : '#3c404a'}"/>`);
  text(`${d.score} из 5`, 52, 800, acc, y); t[t.length - 1] = t[t.length - 1].replace(`x="${X}"`, `x="${X + 370}"`); y += 118;
  text(HEAD[d.type], 86, 800, '#f5f5f8'); y += 104;

  const block = (head: string, body: string, fill = '#ebecf0', max = 3) => {
    if (!body) return;
    text(head.toUpperCase(), 33, 800, acc); y += 60;
    for (const ln of wrap(body, 44, TW, max)) { text(ln, 44, 400, fill); y += 58; }
    y += 38;
  };
  block('Делать', cap(d.act));
  block(`${d.heal ? 'Выровнять день' : 'Опора дня'} · теория стихий`, cap(d.add.theory));
  const hh = bestHours(a, d, shift);
  if (hh.length) block('Лучшие часы', hh.slice(0, 2).join(', '), '#ebecf0', 1);
  const risk = [...d.notes, ...d.warn][0];
  if (risk) block('Осторожно', cap(risk), '#e6cdc8', 2);

  const k = days.findIndex((x) => x.iso === d.iso), week = days.slice(k + 1, k + 8);
  const top = week.reduce<DayInfo | null>((m, x) => (!m || x.score > m.score ? x : m), null);
  const BG = { good: 'благоприятный', bad: 'тяжёлый', mixed: 'смешанный', calm: 'спокойный' } as const;
  const BGN = { good: 'благоприятное', bad: 'тяжёлое', mixed: 'смешанное', calm: 'спокойное' } as const;
  if (y < 2190) { text(`Фон: ${d.bg.luck ? `десятилетие ${BGN[d.bg.luck]}, ` : ''}год ${BG[d.bg.year]}`, 36, 600, '#a9aeb9'); y += 56; }
  if (top && y < 2270) text(`Лучший день недели: ${label(top.iso)} · ${top.score} из 5`, 38, 600, '#a9aeb9');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><radialGradient id="g" cx="0.3" cy="0.62" r="0.85"><stop offset="0" stop-color="${acc}" stop-opacity="0.22"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0d12"/><stop offset="1" stop-color="#14161d"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#b)"/><rect width="${w}" height="${h}" fill="url(#g)"/>
${t.join('\n')}
</svg>`;
}
