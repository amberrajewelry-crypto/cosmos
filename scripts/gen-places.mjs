// База мест: data/places.tsv.gz (scripts/build-places.py из GeoNames) → public/places/
//   core.json        — ядро (крупные города, столицы, СНГ ≥30k) + справочники tz/регионов/стран + версия
//   <ver>/<hex>.json — шарды по первым 2 (у больших — 3) буквам любого слова любого имени
// Строка: [name, ru, lat, lon, tzI, cc, regI, district, pop, aliases[], ascii]; хвостовые пустые обрезаны.
// fold() обязан совпадать с src/data/places.ts (проверяет test/places.test.ts).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'data/places.tsv.gz');
const OUT = path.join(ROOT, 'public/places');
const SPLIT_AT = 2500;
const RU_SPEAK = new Set(['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'MD', 'TM', 'LV', 'LT', 'EE', 'IL']);

export const fold = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[-‐–—/.,()]/g, ' ')
  .replace(/[^a-zа-я0-9 ]/g, '').replace(/\s+/g, ' ').trim();

const raw = zlib.gunzipSync(fs.readFileSync(SRC)).toString('utf8').split('\n');
const countries = JSON.parse(raw[0].slice(1));
const tzList = [], tzIdx = new Map(), regList = [], regIdx = new Map();
const idx = (list, map, v) => { if (!map.has(v)) { map.set(v, list.length); list.push(v); } return map.get(v); };

const rows = [];   // упакованные строки
const names = [];  // имена для ключей
const isCore = [];
for (const line of raw.slice(1)) {
  if (!line) continue;
  const [name, ru, lat, lon, tz, cc, region, district, pop, aliases, ascii, cap] = line.split('\t');
  const al = aliases ? aliases.split('|') : [];
  const r = [name, ru, +lat, +lon, idx(tzList, tzIdx, tz), cc, idx(regList, regIdx, region), district, +pop || 0, al, ascii];
  while (r.length > 6 && (r.at(-1) === '' || r.at(-1) === 0 || (Array.isArray(r.at(-1)) && !r.at(-1).length))) r.pop();
  rows.push(r);
  names.push([name, ru, ascii, ...al]);
  const p = +pop || 0;
  isCore.push(p >= 100000 || cap === 'C' || (RU_SPEAK.has(cc) && p >= 30000));
}

const wordsOf = (i) => new Set(names[i].flatMap((s) => (s ? fold(s).split(' ') : [])).filter((w) => w.length >= 2));
const sh2 = new Map();
const push = (m, k, i) => { let a = m.get(k); if (!a) m.set(k, (a = [])); if (a.at(-1) !== i) a.push(i); };
const W = rows.map((_, i) => wordsOf(i));
W.forEach((ws, i) => { for (const w of ws) push(sh2, w.slice(0, 2), i); });

const files = new Map();
const split = [];
for (const [k, list] of sh2) {
  if (list.length <= SPLIT_AT) { files.set(k, list); continue; }
  split.push(k);
  // 2-буквенный шард делённого ключа: только слова ровно из 2 букв (остальное — в 3-буквенных)
  files.set(k, list.filter((i) => W[i].has(k)));
  for (const i of list) for (const w of W[i]) if (w.length >= 3 && w.startsWith(k)) push(files, w.slice(0, 3), i);
}

const hex = (k) => Buffer.from(k, 'utf8').toString('hex');
const body = new Map([...files].map(([k, list]) => [hex(k), JSON.stringify(list.map((i) => rows[i]))]));
const h = crypto.createHash('sha1'); for (const k of [...body.keys()].sort()) h.update(k).update(body.get(k)); const ver = h.digest('hex').slice(0, 8);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, ver), { recursive: true });
let total = 0;
for (const [h, b] of body) { fs.writeFileSync(path.join(OUT, ver, h + '.json'), b); total += b.length; }
const core = { v: ver, count: rows.length, split: split.sort(), tz: tzList, reg: regList, countries, rows: rows.filter((_, i) => isCore[i]) };
fs.writeFileSync(path.join(OUT, 'core.json'), JSON.stringify(core));
console.log(`places: ${rows.length} мест, ядро ${core.rows.length}, шардов ${body.size} (делённых ${split.length}), ${(total / 1e6).toFixed(1)} МБ, v=${ver}`);
