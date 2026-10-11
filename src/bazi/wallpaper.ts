// Заставка телефона «карта дня» (SVG → PNG в api/zastavka). Чистая функция: день + часы → SVG.
// Зоны экрана блокировки iPhone: верх до ~760 px — часы и виджеты (только небо), низ от ~2250 — фонарик/камера
// (между ними полоса недели). Орбита в середине, текст коротко: оценка, что делать, часы, одно предупреждение.
import { bestHours, JC_FAV, prepOnly, type DayInfo } from './days';
import type { Analysis } from './calc';
import { STEMS, BRANCHES } from './core';

export const WP = { w: 1179, h: 2556 };
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WDF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const HEAD: Record<DayInfo['type'], string> = { peak: 'День силы', 'peak-hit': 'Сила с изломом', calm: 'Ровное течение', heavy: 'Время копить' };
/** Дело дня одним словом и символом — по богу дня (十神). */
const ACT_W: Record<string, string> = { SS: 'Творить', SG: 'Говорить', PC: 'Деньги', ZC: 'Счёт', QS: 'Вызов', ZG: 'Статус', PY: 'Тишина', ZY: 'Учёба', BJ: 'Команда', JC: 'Беречь', FAV: 'Свои' };
const ACT_IC: Record<string, string> = { SS: 'pen', SG: 'talk', PC: 'bag', ZC: 'bag', QS: 'peak', ZG: 'crown', PY: 'eye', ZY: 'book', BJ: 'ppl', JC: 'shield', FAV: 'ppl' };
/** Риск одним словом. */
export function riskWord(r: string): string {
  const m = r.match(/«([^,»]+)/); if (m && r.includes('сфере')) return cap(m[1] === 'род' ? 'старшие' : m[1]);
  const W: [RegExp, string][] = [[/против месяца/, 'Траты'], [/недопоним/, 'Слова'], [/документ/, 'Бумаги'], [/с текущим годом/, 'Крупное'], [/двойной удар|на вас лично/, 'Решения'], [/соперник/, 'Соперник'], [/запас прочности/, 'Силы'], [/неполным|в союз/, 'Итог']];
  return W.find(([re]) => re.test(r))?.[1] ?? 'Спешка';
}
const AN_GEN = ['Крысы', 'Быка', 'Тигра', 'Кролика', 'Дракона', 'Змеи', 'Лошади', 'Козы', 'Обезьяны', 'Петуха', 'Собаки', 'Свиньи'];
/** Риск — в одну строку: «в сфере «X»» → «: X», хвост после тире и лишние советы срезаны. */
export const wpRisk = (r: string) => r.startsWith('день идёт против месяца') ? 'Против месяца: крупно не тратить'
  : cap(r.split(' — ')[0].replace(/ в сфере «(.+?)»/, ': $1').replace(/, без резких шагов$/, ''));

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

/** Без многоточия: если не влезает — сначала убрать скобки, потом отрезать по границе фразы (; — , но). */
export function fit(text: string, size: number, width: number, max: number): string[] {
  const ok = (t: string) => wrap(t, size, width, 99).length <= max;
  if (ok(text)) return wrap(text, size, width, max);
  let t = text.replace(/\s*\([^)]*\)/g, '').replace(/\s+([,;])/g, '$1');
  for (const sep of [';', ' — ', ', но ', ', а ', ', ']) {
    if (ok(t)) break;
    while (!ok(t) && t.lastIndexOf(sep) > 8) t = t.slice(0, t.lastIndexOf(sep));
  }
  return wrap(t.replace(/[,;:\s—-]+$/, ''), size, width, max);
}

/** Сдвиг часов на руке от солнечного времени (как в ui.clockShift): человек в поясе рождения — по долготе, иначе 0. */
export function tzOffsetH(tz: string, at = new Date()): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(at).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(at.getTime() / 6e4) * 6e4) / 36e5 * 4) / 4;
}

const EL_GLOW = ['#5fc98a', '#ff6a3d', '#e0ad52', '#e6ebf3', '#4f8ef0'];
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

/** Картинки сайта для заставки: data:-URI животных (12, порядок ветвей) и шаров стихий (5). Без них — векторная мандала. */
export interface WpImages { an: string[]; el: string[]; bg?: string[]; st?: string[] }
const EL_RU = ['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'];
/** Орбита как в шапке сайта, но собранная в композицию: медальоны под животными, лучи от центра, инь-ян,
 *  у знака и стихии дня — золотой ореол с лучами. */
const BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
function orbit(cx: number, cy: number, R: number, stemEl: number, branch: number, img: WpImages, wealth = -1): string {
  const o: string[] = [], gold = '#d9b968';
  // мягкий диск-подложка и лучи от центра к каждому знаку
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R + 96}" fill="url(#disc)"/>`);
  for (let i = 0; i < 12; i++) { const [x, y] = pt(cx, cy, R - 62, i * 30), [x0, y0] = pt(cx, cy, 70, i * 30);
    o.push(`<line x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x)}" y2="${f1(y)}" stroke="${i === branch ? EL_GLOW[BR_EL[i]] : gold}" stroke-opacity="${i === branch ? .55 : .1}" stroke-width="${i === branch ? 2.5 : 1.2}"/>`); }
  // кольца и шкала
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R + 78}" fill="none" stroke="url(#ringg)" stroke-width="2.5"/>`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R + 64}" fill="none" stroke="${gold}" stroke-opacity=".14" stroke-width="1.2"/>`);
  for (let i = 0; i < 120; i++) { const big = i % 10 === 0, [x1, y1] = pt(cx, cy, R + 64, i * 3), [x2, y2] = pt(cx, cy, R + (big ? 50 : 58), i * 3);
    o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${gold}" stroke-opacity="${big ? .5 : .18}" stroke-width="${big ? 2.2 : 1}"/>`); }
  o.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${gold}" stroke-opacity=".2" stroke-width="1.5" stroke-dasharray="2 10"/>`);
  // пять стихий: круг порождения (золотой пунктир) и звезда сдерживания
  const rE = R * 0.53, pos = [288, 0, 72, 144, 216].map((a) => pt(cx, cy, rE, a));
  o.push(`<circle cx="${cx}" cy="${cy}" r="${f1(rE)}" fill="none" stroke="${gold}" stroke-opacity=".28" stroke-width="1.6" stroke-dasharray="5 9"/>`);
  for (let e = 0; e < 5; e++) { const [x1, y1] = pos[e], [x2, y2] = pos[(e + 2) % 5];
    o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="url(#star)" stroke-width="1.8"/>`); }
  // инь-ян в центре
  const r = 46;
  o.push(`<circle cx="${cx}" cy="${cy}" r="${r + 40}" fill="${gold}" opacity=".18" filter="url(#blur)"/>`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${r + 14}" fill="none" stroke="${gold}" stroke-opacity=".45" stroke-width="1.5"/>`);
  o.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0818" stroke="url(#goldv)" stroke-width="2.5"/>`);
  o.push(`<path d="M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${r / 2} ${r / 2} 0 0 1 ${cx} ${cy}A${r / 2} ${r / 2} 0 0 0 ${cx} ${cy - r}Z" fill="url(#goldv)"/>`);
  o.push(`<circle cx="${cx}" cy="${cy - r / 2}" r="${f1(r / 7)}" fill="#0a0818"/><circle cx="${cx}" cy="${cy + r / 2}" r="${f1(r / 7)}" fill="#e8c97e"/>`);
  // знаки на медальонах
  for (let i = 0; i < 12; i++) { const on = i === branch, [x, y] = pt(cx, cy, R, i * 30), c = EL_GLOW[BR_EL[i]], rr = on ? 74 : 58, sz = on ? 132 : 100;
    if (on) { o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="110" fill="${c}" opacity=".38" filter="url(#blur)"/>`);
      for (let k = 0; k < 16; k++) { const [x1, y1] = pt(x, y, rr + 10, k * 22.5), [x2, y2] = pt(x, y, rr + (k % 2 ? 22 : 34), k * 22.5);
        o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${gold}" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/>`); } }
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr}" fill="url(#med)" stroke="${on ? '#e8c97e' : c}" stroke-opacity="${on ? .95 : .3}" stroke-width="${on ? 3 : 1.5}"/>`);
    if (on) o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr - 9}" fill="none" stroke="#e8c97e" stroke-opacity=".35" stroke-width="1.2"/>`);
    o.push(`<image href="${img.an[i]}" x="${f1(x - sz / 2)}" y="${f1(y - sz / 2)}" width="${sz}" height="${sz}" opacity="${on ? 1 : .72}"/>`); }
  // шары стихий с ободком
  for (let e = 0; e < 5; e++) { const [x, y] = pos[e], on = e === stemEl, sz = on ? 190 : 128, c = EL_GLOW[e];
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${on ? 130 : 80}" fill="${c}" opacity="${on ? .5 : .2}" filter="url(#blur)"/>`);
    o.push(`<image href="${img.el[e]}" x="${f1(x - sz / 2)}" y="${f1(y - sz / 2)}" width="${sz}" height="${sz}"/>`);
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${sz / 2}" fill="url(#shine)"/>`);
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${sz / 2}" fill="none" stroke="${c}" stroke-opacity="${on ? .95 : .55}" stroke-width="${on ? 3.5 : 2}"/>`);
    o.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${sz / 2 + 10}" fill="none" stroke="${c}" stroke-opacity="${on ? .45 : .18}" stroke-width="1.2" stroke-dasharray="${on ? '2 6' : '1 7'}"/>`);
    if (e === wealth) { const bx = x + sz * 0.42, by = y - sz * 0.42;
      o.push(`<circle cx="${f1(bx)}" cy="${f1(by)}" r="70" fill="#e8c97e" opacity=".55" filter="url(#blur)"/><circle cx="${f1(bx)}" cy="${f1(by)}" r="50" fill="url(#goldv)" stroke="#fff3cf" stroke-width="2"/><circle cx="${f1(bx)}" cy="${f1(by)}" r="40" fill="none" stroke="#7a5420" stroke-opacity=".6" stroke-width="1.5"/><rect x="${f1(bx - 14)}" y="${f1(by - 14)}" width="28" height="28" fill="#1a1230" stroke="#7a5420" stroke-width="1.5"/>`); }
    if (on) o.push(`<text x="${f1(x)}" y="${f1(y + sz / 2 + 52)}" text-anchor="middle" font-family="Manrope" font-size="44" font-weight="700" fill="${c}" letter-spacing="4" stroke="#0b0824" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${EL_RU[e].toUpperCase()}</text>`); }
  return o.join('');
}

/** Оберег дня (五行大义: 木青 火赤 土黄 金白 水黑). Стихия дня полезна → её цвет (усилить);
 *  вредна → полезная стихия, что её сдерживает или забирает (порядок полезных), иначе первая полезная.
 *  Люди — по роли стихии оберега к господину дня (十神) и знакам года этой стихии. */
/** Камень стихии и сторона света (五行: 木东 火南 土中/艮坤 金西 水北); Земле — ось СВ–ЮЗ (艮 и 坤 — земляные триграммы). */
const STONE = ['Нефрит', 'Гранат', 'Цитрин', 'Хрусталь', 'Обсидиан'];
const DIR_W = ['Восток', 'Юг', 'СВ–ЮЗ', 'Запад', 'Север'], DIR_A = [90, 180, 45, 270, 0];
const EL_COL = ['зелёный, бирюза', 'красный, бордо', 'жёлтый, охра', 'белый, серебро', 'чёрный, синий'];
const EL_SW = [['#2f8f5b', '#2fb3a6'], ['#c8322b', '#7a1f2b'], ['#e0b84a', '#b07a3a', '#d9c3a0'], ['#f2f2ee', '#b9c0c8'], ['#141420', '#1f3566']];
/** Шаг к деньгам по роли стихии оберега к господину дня: 比劫 食伤 财 官杀 印. */
const STEP = ['Звать партнёров в общее дело', 'Показать работу: пост, демо, витрина', 'Звонить тем, кто уже покупал', 'Писать заказчикам и руководству', 'Спросить совета у наставника'];
export function talisman(a: Analysis, stemEl: number, brEl: number, prep: boolean): { el: number; money: boolean; head: string; step: string; sw: string[] } {
  const fav = a.consensus as number[], bad = [stemEl, brEl].filter((e) => !fav.includes(e));
  const cure = (h: number) => fav.find((f) => (f + 2) % 5 === h || (h + 1) % 5 === f);
  const el = !bad.length ? stemEl : bad.map(cure).find((x) => x !== undefined) ?? fav[0] ?? stemEl;
  const rel = ((el - a.dmEl) % 5 + 5) % 5, money = rel === 2 && !prep;
  return { el, money, head: `${money ? 'Цвет денег' : 'Оберег'} · ${EL_COL[el]}`, step: prep ? 'Свои и наставники, новых сделок нет' : STEP[rel], sw: EL_SW[el] };
}

/** Значки строк карточки (24×24, линия). */
const ICON: Record<string, string> = {
  act: '<path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z"/>',
  sup: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  hrs: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2.5"/>',
  risk: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  talk: '<path d="M4 5h16v10H10l-5 4v-4H4z"/>',
  peak: '<path d="M2.5 20l6.5-11 4 6 3-4 5.5 9z"/><path d="M9 9V3.5l4.5 1.8L9 7"/>',
  crown: '<path d="M3 18l1.5-10 5 4.5L12 5l2.5 7.5 5-4.5L21 18z"/><path d="M3 20.5h18"/>',
  eye: '<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M3 5.5c3-1.2 6-1 9 .8 3-1.8 6-2 9-.8v13.5c-3-1.2-6-1-9 .8-3-1.8-6-2-9-.8z"/><path d="M12 6.3v14"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.6 8-8 9-4.4-1-8-4-8-9V6z"/>',
  bag: '<path d="M5 10h14l-1.5 10h-11z"/><path d="M9 10V7.5a3 3 0 0 1 6 0V10"/><path d="M12 13v4M10.5 14.5h3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6"/>',
  ppl: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M16 14.2c2.6.1 4.4 1.6 5 4.3"/>',
};

export function wallpaperSvg(a: Analysis, d: DayInfo, days: DayInfo[], shift: number, img?: WpImages): string {
  const { w, h } = WP, CX = w / 2;
  const st = STEMS[d.idx % 10], br = BRANCHES[d.idx % 12], col = EL_GLOW[st.el], gold = '#e2c47c';
  const t: string[] = [];
  const OY = 1250, OK = 0.76; // центр и масштаб орбиты — круг главный герой
  let y = 1702;
  const text = (s: string, size: number, weight: number, fill: string, yy = y, extra = '', fam = 'Manrope') =>
    t.push(`<text x="${CX}" y="${yy}" text-anchor="middle" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(s)}</text>`);

  text(cap(label(d.iso, true)).toUpperCase(), 30, 600, '#cbbf9f', y, 'letter-spacing="8"'); y += 98;
  text(HEAD[d.type], 108, 600, 'url(#goldt)', y, '', 'Cormorant'); y += 58;
  const mine = (d.fav as number[]).includes(st.el) ? 'питает вас' : (d.avoid as number[]).includes(st.el) ? 'давит на вас' : 'идёт мимо вас';
  text(`${EL_RU[st.el]} ${AN_GEN[d.idx % 12]} ${mine}`, 36, 600, col, y, 'letter-spacing="2"'); y += 62;
  for (let i = 0; i < 5; i++) { const x = CX - 128 + i * 64, on = i < d.score;
    if (on) t.push(`<circle cx="${x}" cy="${y - 14}" r="24" fill="${gold}" opacity=".3" filter="url(#blur)"/>`);
    t.push(diamond(x, y - 14, 19, on ? 'url(#goldv)' : 'none', on ? '' : `stroke="${gold}" stroke-opacity=".35" stroke-width="2"`)); }

  // амулеты дня: символ + одно слово
  const prep = prepOnly(d), hh = bestHours(a, d, shift), tl = talisman(a, st.el, br.el, prep);
  const rk = [...d.notes, ...d.warn], risk = rk.find((x) => x.includes('против месяца')) ?? rk[0];
  const gk = d.act === JC_FAV ? 'FAV' : d.god.key;
  const am: { ic: string; word: string; cap: string; c: string; sw?: string[]; coin?: boolean; stone?: string; dir?: number }[] = [
    img?.st ? { ic: '', word: STONE[tl.el], cap: tl.money ? 'камень денег' : 'оберег', c: gold, stone: img.st[tl.el], coin: tl.money }
      : { ic: '', word: cap(tl.head.split(' · ')[1].split(',')[0]), cap: tl.money ? 'цвет денег' : 'оберег', c: gold, sw: tl.sw, coin: tl.money },
    { ic: ACT_IC[gk] ?? 'act', word: ACT_W[gk] ?? 'Дело', cap: prep ? 'копить' : 'дело дня', c: gold },
  ];
  if (hh.length) am.push({ ic: 'hrs', word: hh[0].replace(/:\d\d/g, '').replace(/\s/g, ''), cap: 'часы удачи', c: gold });
  am.push({ ic: '', word: DIR_W[tl.el], cap: 'сторона', c: gold, dir: DIR_A[tl.el], coin: false });
  if (risk) am.push({ ic: 'risk', word: riskWord(risk), cap: 'осторожно', c: '#e3a08e' });
  const AY = 2068, gap = am.length > 4 ? 212 : am.length > 3 ? 252 : 290;
  am.forEach((m, i) => { const x = CX + (i - (am.length - 1) / 2) * gap, r = am.length > 4 ? 56 : 64;
    t.push(`<circle cx="${f1(x)}" cy="${AY}" r="${r + 22}" fill="${gold}" opacity=".16" filter="url(#blur)"/>`);
    if (m.stone) {
      t.push(`<circle cx="${f1(x)}" cy="${AY}" r="${r}" fill="#05040c" stroke="#f3dc9c" stroke-opacity=".8" stroke-width="2.5"/><image href="${m.stone}" x="${f1(x - r + 4)}" y="${AY - r + 4}" width="${2 * r - 8}" height="${2 * r - 8}"/>`);
      if (false) t.push(`<g transform="translate(${f1(x + r * .72)} ${f1(AY - r * .72)})"><circle r="19" fill="url(#goldv)" stroke="#fff3cf" stroke-width="1.5"/><rect x="-6" y="-6" width="12" height="12" fill="#1a1230"/></g>`);
    } else if (m.dir !== undefined) {
      t.push(`<circle cx="${f1(x)}" cy="${AY}" r="${r}" fill="url(#med)" stroke="${m.c}" stroke-opacity=".85" stroke-width="2.5"/>`);
      for (let q = 0; q < 8; q++) { const [x1, y1] = pt(x, AY, r - 6, q * 45), [x2, y2] = pt(x, AY, r - (q % 2 ? 12 : 18), q * 45);
        t.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${m.c}" stroke-opacity="${q % 2 ? .35 : .7}" stroke-width="2"/>`); }
      t.push(`<text x="${f1(x)}" y="${AY - r + 34}" text-anchor="middle" font-family="Manrope" font-size="15" font-weight="800" fill="${m.c}" fill-opacity=".8">С</text>`);
      const two = m.dir === 45;
      t.push(`<g transform="rotate(${m.dir} ${f1(x)} ${AY})"><path d="M${f1(x)} ${AY - r + 22}L${f1(x + 9)} ${AY}L${f1(x)} ${AY + (two ? r - 22 : 8)}L${f1(x - 9)} ${AY}Z" fill="url(#goldv)" stroke="#fff3cf" stroke-width="1"/>${two ? '' : `<path d="M${f1(x)} ${AY + 8}L${f1(x + 7)} ${AY}L${f1(x)} ${AY + r - 26}L${f1(x - 7)} ${AY}Z" fill="#5a5470"/>`}</g><circle cx="${f1(x)}" cy="${AY}" r="5" fill="#fff3cf"/>`);
    } else if (m.sw) {
      t.push(`<circle cx="${f1(x)}" cy="${AY}" r="${r}" fill="url(#sw${i})" stroke="#f3dc9c" stroke-width="3"/><circle cx="${f1(x)}" cy="${AY}" r="${r}" fill="url(#shine)"/>`);
      t.push(`<radialGradient id="sw${i}" cx="0.4" cy="0.35" r="0.75">${m.sw.map((c, j) => `<stop offset="${(j / Math.max(1, m.sw!.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</radialGradient>`);
      if (m.coin) t.push(`<circle cx="${f1(x)}" cy="${AY}" r="34" fill="none" stroke="#fff3cf" stroke-opacity=".9" stroke-width="3"/><rect x="${f1(x - 13)}" y="${AY - 13}" width="26" height="26" fill="#1a1230" stroke="#fff3cf" stroke-width="2.5"/>`);
    } else {
      t.push(`<circle cx="${f1(x)}" cy="${AY}" r="${r}" fill="url(#med)" stroke="${m.c}" stroke-opacity=".85" stroke-width="2.5"/><circle cx="${f1(x)}" cy="${AY}" r="${r - 9}" fill="none" stroke="${m.c}" stroke-opacity=".3" stroke-width="1.2"/>`);
      t.push(`<g transform="translate(${f1(x - 31)} ${AY - 31}) scale(2.6)" fill="none" stroke="${m.c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[m.ic]}</g>`);
    }
    t.push(`<text x="${f1(x)}" y="${AY + r + 50}" text-anchor="middle" font-family="Manrope" font-size="${r < 60 ? 32 : 36}" font-weight="700" fill="${m.c === gold ? '#f3e7c4' : '#f6c7ba'}">${esc(m.word)}</text>`);
    t.push(`<text x="${f1(x)}" y="${AY + r + 84}" text-anchor="middle" font-family="Manrope" font-size="${r < 60 ? 18 : 20}" font-weight="700" fill="${m.c}" fill-opacity=".75" letter-spacing="${r < 60 ? 2 : 4}">${esc(m.cap.toUpperCase())}</text>`); });
  const k = days.findIndex((x) => x.iso === d.iso);

  // полоса недели внизу: сегодня + 6 дней, между кнопками фонарика и камеры
  const WK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], strip = days.slice(k, k + 7), cw = 88, sx = CX - (strip.length * cw) / 2, sy = 2338;
  t.push(`<rect x="${sx - 14}" y="${sy - 58}" width="${strip.length * cw + 28}" height="172" rx="34" fill="#0c0a22" fill-opacity=".35" stroke="${gold}" stroke-opacity=".12" stroke-width="1.2"/>`);
  strip.forEach((x, i) => { const [yy, mm, dd] = x.iso.split('-').map(Number), cx = sx + i * cw + cw / 2, now = i === 0;
    if (now) t.push(`<rect x="${cx - 40}" y="${sy - 44}" width="80" height="144" rx="24" fill="${gold}" fill-opacity=".12" stroke="${gold}" stroke-opacity=".6" stroke-width="2"/>`);
    t.push(`<text x="${cx}" y="${sy - 6}" text-anchor="middle" font-family="Manrope" font-size="24" font-weight="600" fill="${now ? gold : '#8f88ad'}" letter-spacing="2">${WK[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()].toUpperCase()}</text>`);
    t.push(`<text x="${cx}" y="${sy + 44}" text-anchor="middle" font-family="Manrope" font-size="40" font-weight="800" fill="${now ? '#fff3cf' : '#e6e1f2'}">${dd}</text>`);
    if (x.score >= 4) t.push(`<circle cx="${cx}" cy="${sy + 86}" r="16" fill="${gold}" opacity="${x.score === 5 ? .5 : .3}" filter="url(#blur)"/>`);
    t.push(diamond(cx, sy + 86, 6 + x.score * 2, x.score >= 4 ? 'url(#goldv)' : 'none', x.score >= 4 ? '' : `stroke="${gold}" stroke-opacity="${x.score === 3 ? .6 : .3}" stroke-width="2"`));
  });

  // звёзды
  const r = rng(d.iso), stars: string[] = [];
  for (let i = 0; i < 260; i++) { const x = 50 + r() * (w - 100), yy = 50 + r() * (h - 100), s = r(), big = s > .975 && (yy < 960 || x < 110 || x > w - 110);
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
<radialGradient id="disc" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2a1d5c" stop-opacity=".55"/><stop offset=".7" stop-color="#160f38" stop-opacity=".35"/><stop offset="1" stop-color="#0b0824" stop-opacity="0"/></radialGradient>
<radialGradient id="med" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#2b2160" stop-opacity=".9"/><stop offset="1" stop-color="#0a0820" stop-opacity=".95"/></radialGradient>
<radialGradient id="shine" cx="0.35" cy="0.25" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9c" stop-opacity=".7"/><stop offset=".5" stop-color="#c9a85c" stop-opacity=".15"/><stop offset="1" stop-color="#f3dc9c" stop-opacity=".6"/></linearGradient>
<linearGradient id="star" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ef5a3c" stop-opacity=".45"/><stop offset="1" stop-color="#e2c47c" stop-opacity=".3"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241b52" stop-opacity=".62"/><stop offset="1" stop-color="#0d0a24" stop-opacity=".72"/></linearGradient>
<linearGradient id="glassb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c47c" stop-opacity=".5"/><stop offset=".5" stop-color="#e2c47c" stop-opacity=".1"/><stop offset="1" stop-color="#e2c47c" stop-opacity=".3"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset=".55" stop-color="#05040f" stop-opacity="0"/><stop offset="1" stop-color="#05040f" stop-opacity=".7"/></radialGradient>
<linearGradient id="low" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07051a" stop-opacity="0"/><stop offset=".3" stop-color="#07051a" stop-opacity=".45"/><stop offset="1" stop-color="#07051a" stop-opacity=".25"/></linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#06041a" stop-opacity=".72"/><stop offset=".6" stop-color="#06041a" stop-opacity=".5"/><stop offset="1" stop-color="#06041a" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="blurL" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="60"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
${img?.bg ? `<image href="${img.bg[st.el]}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
<rect width="${w}" height="${h}" fill="url(#vig)"/>
<rect y="${h - 1180}" width="${w}" height="1180" fill="url(#low)"/>
<ellipse cx="${CX}" cy="1450" rx="640" ry="300" fill="url(#halo)"/>` : `<ellipse cx="${CX}" cy="${OY}" rx="560" ry="500" fill="url(#neb)"/>
<ellipse cx="230" cy="1700" rx="520" ry="620" fill="url(#neb2)"/>
<ellipse cx="1000" cy="1250" rx="420" ry="480" fill="url(#neb)" opacity=".6"/>`}
${(img?.bg ? stars.filter((_, i) => i % 3 === 0) : stars).join('')}
<g transform="translate(${CX} ${OY}) scale(${OK}) translate(${-CX} -550)">${img ? orbit(CX, 550, 400, st.el, d.idx % 12, img, (a.dmEl + 2) % 5) : mandala(CX, 550, 410, st.el, d.idx % 12, br.el)}</g>
${t.join('\n')}
</svg>`;
}
