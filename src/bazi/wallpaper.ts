// Заставка телефона «карта дня» (SVG → PNG в api/zastavka). Чистая функция: день + часы → SVG.
// Верх ~35% оставлен под часы экрана блокировки, низ — под кнопки фонарика/камеры.
import { bestHours, type DayInfo } from './days';
import type { Analysis } from './calc';
import { STEMS, BRANCHES } from './core';

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

const EL_GLOW = ['#5fc98a', '#ff6a3d', '#e0ad52', '#e6ebf3', '#4f8ef0'];
const EL_OF = ['дерева', 'огня', 'земли', 'металла', 'воды'];
/** Детерминированный шум по дате: звёзды одного дня не прыгают при перерисовке. */
function rng(seed: string) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
const f1 = (n: number) => n.toFixed(1);
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
const diamond = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<path d="M${f1(cx)} ${f1(cy - r)}L${f1(cx + r * .72)} ${f1(cy)}L${f1(cx)} ${f1(cy + r)}L${f1(cx - r * .72)} ${f1(cy)}Z" fill="${fill}" ${extra}/>`;

/** Мандала: круг 12 животных (ветвь дня светится), пять стихий с кругом порождения и звездой сдерживания, инь-ян в центре. */
function mandala(cx: number, cy: number, R: number, stemEl: number, branch: number, branchEl: number): string {
  const o: string[] = [], gold = '#d9b968';
  o.push(`<g opacity="0.78">`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${gold}" stroke-opacity=".45" stroke-width="2"/>`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R - 16}" fill="none" stroke="${gold}" stroke-opacity=".22" stroke-width="1.5"/>`);
  for (let i = 0; i < 72; i++) { const [x1, y1] = pt(cx, cy, R - 16, i * 5), [x2, y2] = pt(cx, cy, R - (i % 6 === 0 ? 40 : 26), i * 5);
    o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${gold}" stroke-opacity="${i % 6 === 0 ? .55 : .25}" stroke-width="${i % 6 === 0 ? 2.4 : 1.2}"/>`); }
  for (let i = 0; i < 12; i++) { const [x, y] = pt(cx, cy, R - 68, i * 30), on = i === branch;
    o.push(on ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="34" fill="${EL_GLOW[branchEl]}" opacity=".35" filter="url(#blur)"/>${diamond(x, y, 17, EL_GLOW[branchEl])}`
      : diamond(x, y, 8, gold, 'fill-opacity=".45"')); }
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R - 106}" fill="none" stroke="${gold}" stroke-opacity=".3" stroke-width="1.5" stroke-dasharray="3 10"/>`);
  // священная геометрия: два квадрата и два треугольника
  for (const [n, rot, rr] of [[4, 0, R - 106], [4, 45, R - 106], [3, 0, R - 130], [3, 180, R - 130]] as const) {
    const ps = Array.from({ length: n }, (_, k) => pt(cx, cy, rr, rot + k * 360 / n));
    o.push(`<path d="M${ps.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z" fill="none" stroke="${gold}" stroke-opacity=".16" stroke-width="1.5"/>`); }
  // пять стихий: Огонь сверху, по часовой — Земля, Металл, Вода, Дерево
  const rE = R * 0.5, pos = [288, 0, 72, 144, 216].map((a) => pt(cx, cy, rE, a));
  o.push(`<circle cx="${cx}" cy="${cy}" r="${f1(rE)}" fill="none" stroke="${gold}" stroke-opacity=".4" stroke-width="2"/>`);
  for (let e = 0; e < 5; e++) { const [x1, y1] = pos[e], [x2, y2] = pos[(e + 2) % 5];
    o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#e86a50" stroke-opacity=".28" stroke-width="1.6"/>`); }
  for (let e = 0; e < 5; e++) { const [x, y] = pos[e], on = e === stemEl, r = on ? 30 : 17;
    if (on) o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="70" fill="${EL_GLOW[e]}" opacity=".45" filter="url(#blur)"/>`);
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#0b0920" stroke="${EL_GLOW[e]}" stroke-width="${on ? 4 : 2.5}"/>`);
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${on ? 13 : 6}" fill="${EL_GLOW[e]}" opacity="${on ? 1 : .8}"/>`); }
  // инь-ян
  const r = R * 0.17;
  o.push(`<circle cx="${cx}" cy="${cy}" r="${f1(r + 14)}" fill="none" stroke="${gold}" stroke-opacity=".35" stroke-width="1.5"/>`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${f1(r)}" fill="#0a0818" stroke="${gold}" stroke-width="2"/>`);
  o.push(`<path d="M${cx} ${f1(cy - r)}A${f1(r)} ${f1(r)} 0 0 1 ${cx} ${f1(cy + r)}A${f1(r / 2)} ${f1(r / 2)} 0 0 1 ${cx} ${cy}A${f1(r / 2)} ${f1(r / 2)} 0 0 0 ${cx} ${f1(cy - r)}Z" fill="url(#goldv)"/>`);
  o.push(`<circle cx="${cx}" cy="${f1(cy - r / 2)}" r="${f1(r / 7)}" fill="#0a0818"/><circle cx="${cx}" cy="${f1(cy + r / 2)}" r="${f1(r / 7)}" fill="${gold}"/>`);
  o.push(`</g>`);
  return o.join('');
}

export function wallpaperSvg(a: Analysis, d: DayInfo, days: DayInfo[], shift: number): string {
  const { w, h } = WP, CX = w / 2, TW = w - 2 * 120, acc = ACC[d.score] ?? ACC[3];
  const st = STEMS[d.idx % 10], br = BRANCHES[d.idx % 12], col = EL_GLOW[st.el], gold = '#e2c47c';
  const t: string[] = [];
  let y = 1000;
  const text = (s: string, size: number, weight: number, fill: string, yy = y, extra = '', fam = 'Manrope') =>
    t.push(`<text x="${CX}" y="${yy}" text-anchor="middle" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(s)}</text>`);
  const orn = (yy: number, wd = 300) => { t.push(`<line x1="${CX - wd}" y1="${yy}" x2="${CX - 26}" y2="${yy}" stroke="url(#fadeL)" stroke-width="2"/><line x1="${CX + 26}" y1="${yy}" x2="${CX + wd}" y2="${yy}" stroke="url(#fadeR)" stroke-width="2"/>`);
    t.push(diamond(CX, yy, 11, gold)); t.push(diamond(CX - 40, yy, 5, gold, 'fill-opacity=".6"')); t.push(diamond(CX + 40, yy, 5, gold, 'fill-opacity=".6"')); };

  text(cap(label(d.iso, true)).toUpperCase(), 34, 600, '#cbbf9f', y, 'letter-spacing="7"'); y += 120;
  text(HEAD[d.type], 108, 600, 'url(#goldt)', y, '', 'Cormorant'); y += 72;
  text(`Знак дня: ${br.animal} · стихия ${EL_OF[st.el]}`, 38, 600, col, y, 'letter-spacing="2"'); y += 70;
  for (let i = 0; i < 5; i++) { const x = CX - 136 + i * 68, on = i < d.score;
    if (on) t.push(`<circle cx="${x}" cy="${y - 14}" r="26" fill="${acc}" opacity=".35" filter="url(#blur)"/>`);
    t.push(diamond(x, y - 14, 22, on ? acc : 'none', on ? '' : 'stroke="#5a5470" stroke-width="2.5"')); }
  y += 56; text(`${d.score} из 5`, 38, 800, acc, y, 'letter-spacing="3"'); y += 58;
  orn(y); y += 80;

  const block = (head: string, body: string, fill = '#efe9da', max = 3) => {
    if (!body || y > 2060) return;
    text(head.toUpperCase(), 30, 800, gold, y, 'letter-spacing="6"'); y += 58;
    for (const ln of wrap(body, 41, TW, max)) { text(ln, 41, 400, fill); y += 53; }
    y += 30;
  };
  block(d.type === 'heavy' ? 'Тема дня · готовить, не решать' : 'Делать', cap(d.act));
  block(`${d.heal ? 'Выровнять день' : 'Опора дня'}`, cap(d.add.theory));
  const hh = bestHours(a, d, shift);
  if (hh.length) block('Лучшие часы', hh.slice(0, 2).join(', '), '#efe9da', 1);
  const risk = [...d.notes, ...d.warn][0];
  if (risk) block('Осторожно', cap(risk), '#f0c6bb', 2);

  const k = days.findIndex((x) => x.iso === d.iso), week = days.slice(k + 1, k + 8);
  const top = week.reduce<DayInfo | null>((m, x) => (!m || x.score > m.score ? x : m), null);
  const BG = { good: 'благоприятный', bad: 'тяжёлый', mixed: 'смешанный', calm: 'спокойный' } as const;
  const BGN = { good: 'благоприятное', bad: 'тяжёлое', mixed: 'смешанное', calm: 'спокойное' } as const;
  if (y < 2060) { orn(y - 6, 200); y += 58; } else y += 4;
  if (y < 2150) { text(`Фон: ${d.bg.luck ? `десятилетие ${BGN[d.bg.luck]}, ` : ''}год ${BG[d.bg.year]}`, 34, 600, '#a79fbf'); y += 52; }
  if (top && y < 2200) text(`Лучший день недели: ${label(top.iso)} · ${top.score} из 5`, 34, 600, '#a79fbf');

  // полоса недели внизу: сегодня + 6 дней, между кнопками фонарика и камеры
  const WK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], strip = days.slice(k, k + 7), cw = 88, sx = CX - (strip.length * cw) / 2, sy = 2300;
  const TC: Record<DayInfo['type'], string> = { peak: '#6fd99a', 'peak-hit': '#ecd08a', calm: '#9a93b8', heavy: '#6f9cf0' };
  t.push(`<rect x="${sx - 14}" y="${sy - 58}" width="${strip.length * cw + 28}" height="196" rx="34" fill="#0c0a22" fill-opacity=".55" stroke="${gold}" stroke-opacity=".22" stroke-width="1.5"/>`);
  strip.forEach((x, i) => { const [yy, mm, dd] = x.iso.split('-').map(Number), cx = sx + i * cw + cw / 2, c2 = TC[x.type], now = i === 0;
    if (now) t.push(`<rect x="${cx - 40}" y="${sy - 44}" width="80" height="168" rx="24" fill="${gold}" fill-opacity=".12" stroke="${gold}" stroke-opacity=".6" stroke-width="2"/>`);
    t.push(`<text x="${cx}" y="${sy - 6}" text-anchor="middle" font-family="Manrope" font-size="24" font-weight="600" fill="${now ? gold : '#8f88ad'}" letter-spacing="2">${WK[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()].toUpperCase()}</text>`);
    t.push(`<text x="${cx}" y="${sy + 44}" text-anchor="middle" font-family="Manrope" font-size="40" font-weight="800" fill="${now ? '#fff3cf' : '#e6e1f2'}">${dd}</text>`);
    if (x.score >= 4) t.push(`<circle cx="${cx}" cy="${sy + 86}" r="16" fill="${c2}" opacity=".45" filter="url(#blur)"/>`);
    t.push(diamond(cx, sy + 86, x.score >= 4 ? 14 : 10, c2));
    t.push(`<text x="${cx}" y="${sy + 122}" text-anchor="middle" font-family="Manrope" font-size="20" font-weight="600" fill="#8f88ad">${x.score}/5</text>`); });

  // звёзды
  const r = rng(d.iso), stars: string[] = [];
  for (let i = 0; i < 260; i++) { const x = r() * w, yy = r() * h, s = r(), big = s > .975 && (yy < 960 || x < 110 || x > w - 110);
    stars.push(big ? `<path d="M${f1(x)} ${f1(yy - 9)}L${f1(x + 1.6)} ${f1(yy - 1.6)}L${f1(x + 9)} ${f1(yy)}L${f1(x + 1.6)} ${f1(yy + 1.6)}L${f1(x)} ${f1(yy + 9)}L${f1(x - 1.6)} ${f1(yy + 1.6)}L${f1(x - 9)} ${f1(yy)}L${f1(x - 1.6)} ${f1(yy - 1.6)}Z" fill="#fff6dc" opacity=".85"/>`
      : `<circle cx="${f1(x)}" cy="${f1(yy)}" r="${f1(.7 + s * 1.9)}" fill="${s > .8 ? '#f3dfa8' : '#cfd6ff'}" opacity="${(.15 + s * .55).toFixed(2)}"/>`); }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<radialGradient id="sky" cx="0.5" cy="0.24" r="0.95"><stop offset="0" stop-color="#1d1546"/><stop offset=".45" stop-color="#0b0824"/><stop offset="1" stop-color="#030209"/></radialGradient>
<radialGradient id="neb" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${col}" stop-opacity=".30"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
<radialGradient id="neb2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7a4fd8" stop-opacity=".22"/><stop offset="1" stop-color="#7a4fd8" stop-opacity="0"/></radialGradient>
<linearGradient id="goldt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".55" stop-color="#e8c97e"/><stop offset="1" stop-color="#b98a3a"/></linearGradient>
<linearGradient id="goldv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc98"/><stop offset="1" stop-color="#b08436"/></linearGradient>
<linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${gold}" stop-opacity="0"/><stop offset="1" stop-color="${gold}" stop-opacity=".8"/></linearGradient>
<linearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${gold}" stop-opacity=".8"/><stop offset="1" stop-color="${gold}" stop-opacity="0"/></linearGradient>
<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="blurL" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="60"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
<ellipse cx="${CX}" cy="560" rx="620" ry="560" fill="url(#neb)"/>
<ellipse cx="230" cy="1700" rx="520" ry="620" fill="url(#neb2)"/>
<ellipse cx="1000" cy="1250" rx="420" ry="480" fill="url(#neb)" opacity=".6"/>
${stars.join('')}
${mandala(CX, 560, 410, st.el, d.idx % 12, br.el)}
<rect x="36" y="36" width="${w - 72}" height="${h - 72}" rx="64" fill="none" stroke="${gold}" stroke-opacity=".18" stroke-width="2"/>
<rect x="52" y="52" width="${w - 104}" height="${h - 104}" rx="52" fill="none" stroke="${gold}" stroke-opacity=".08" stroke-width="1.5"/>
${t.join('\n')}
</svg>`;
}
