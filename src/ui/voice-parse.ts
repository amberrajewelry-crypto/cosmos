// Голосовой ввод момента рождения: фраза распознавания → дата / время / строка места.
// Чистые функции без DOM — тестируются в node (test/voice-parse.test.ts).
import type { Place } from '../data/places';

export interface SpokenBirth { date?: string; time?: string; place?: string; }

const fold = (s: string): string => s.toLowerCase().replace(/ё/g, 'е');

// Числительные словами → цифры. Порядок важен: составные основы раньше простых («пятьдесят» раньше «пять»).
const NUM_STEMS: Array<[string, number]> = [
  ['одиннадцат', 11], ['двенадцат', 12], ['тринадцат', 13], ['четырнадцат', 14], ['пятнадцат', 15],
  ['шестнадцат', 16], ['семнадцат', 17], ['восемнадцат', 18], ['девятнадцат', 19],
  ['двадцат', 20], ['тридцат', 30], ['сорок', 40], ['пятьдесят', 50], ['пятидесят', 50],
  ['шестьдесят', 60], ['шестидесят', 60], ['семьдесят', 70], ['семидесят', 70],
  ['восемьдесят', 80], ['восьмидесят', 80], ['девяност', 90],
  ['двухтысячн', 2000], ['двести', 200], ['двухсот', 200], ['триста', 300], ['трехсот', 300],
  ['четыреста', 400], ['четырехсот', 400], ['пятьсот', 500], ['пятисот', 500], ['шестьсот', 600],
  ['шестисот', 600], ['семьсот', 700], ['семисот', 700], ['восемьсот', 800], ['восьмисот', 800],
  ['девятьсот', 900], ['девятисот', 900], ['сотого', 100], ['тысяч', 1000],
  ['десят', 10], ['перв', 1], ['один', 1], ['одна', 1], ['втор', 2], ['два', 2], ['две', 2],
  ['трет', 3], ['три', 3], ['четвер', 4], ['четыр', 4], ['пят', 5], ['шест', 6], ['седьм', 7],
  ['сем', 7], ['восьм', 8], ['восем', 8], ['девят', 9],
];
const EXACT: Record<string, number> = { сто: 100, ноль: 0, нуль: 0 };

// Хвост после основы — только окончание числительного: «пят|ого» — число, «Пят|игорск» — город.
const ENDINGS = new Set(['', 'ь', 'и', 'е', 'а', 'о', 'ого', 'его', 'ый', 'ой', 'ий', 'ое', 'ая', 'ом', 'ому', 'ему', 'ых',
  'ть', 'ти', 'того', 'тое', 'той', 'тый', 'ьего', 'ье', 'ья', 'ьей', 'ового', 'овой', 'ного', 'ное']);

function wordNum(w: string): number | null {
  if (w in EXACT) return EXACT[w];
  for (const [stem, v] of NUM_STEMS) if (w.startsWith(stem) && ENDINGS.has(w.slice(stem.length))) return v;
  return null;
}

// Разряд, который число уже заняло: следующее слово сливается, только если меньше него
// («двадцать пять» = 25, но «четырнадцать тридцать» = 14 и 30 — время).
const slot = (v: number): number => (v >= 1000 ? 1000 : v >= 100 ? 100 : v >= 20 ? 10 : 1);

export function wordsToDigits(text: string): string {
  const out: string[] = [];
  let total = 0, cur = 0, last = 0, open = false;
  const flush = (): void => { if (open) out.push(String(total + cur)); total = cur = last = 0; open = false; };
  for (const w of fold(text).split(/\s+/).filter(Boolean)) {
    const v = wordNum(w);
    if (v === null) { flush(); out.push(w); continue; }
    if (v === 1000) { if (open && cur < 1000) { total += (cur || 1) * 1000; cur = 0; last = 1000; continue; } flush(); total = 1000; open = true; last = 1000; continue; }
    if (open && v < slot(last)) { cur += v; last = v; continue; }
    flush(); cur = v; last = v; open = true;
  }
  flush();
  return out.join(' ');
}

const MONTHS: Array<[RegExp, number]> = [
  [/^январ/, 1], [/^феврал/, 2], [/^март/, 3], [/^апрел/, 4], [/^ма[йяе]$/, 5], [/^июн/, 6],
  [/^июл/, 7], [/^август/, 8], [/^сентябр/, 9], [/^октябр/, 10], [/^ноябр/, 11], [/^декабр/, 12],
];
const monthOf = (w: string): number | null => MONTHS.find(([re]) => re.test(w))?.[1] ?? null;

const pad = (n: number): string => String(n).padStart(2, '0');

function fullYear(y: number, now = new Date()): number {
  if (y >= 100) return y;
  const yy = now.getFullYear() % 100;
  return y <= yy ? 2000 + y : 1900 + y;
}

function validDate(y: number, m: number, d: number): string | undefined {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1800 || y > 2100 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// «полтретьего» / «пол третьего» / «в половине третьего» → 2:30 (до перевода слов в цифры).
const HALF = /(?:пол\s?-?|половин[еау]\s+)(перв|втор|трет|четверт|пят|шест|седьм|восьм|девят|десят|одиннадцат|двенадцат)\S*/;
const HALF_H: Record<string, number> = { перв: 1, втор: 2, трет: 3, четверт: 4, пят: 5, шест: 6, седьм: 7, восьм: 8, девят: 9, десят: 10, одиннадцат: 11, двенадцат: 12 };

const FILLER = new Set(['я', 'родился', 'родилась', 'родился,', 'рождения', 'года', 'год', 'г', 'в', 'во', 'город', 'городе', 'и', 'час', 'часа', 'часов', 'минут', 'минута', 'минуты', 'утра', 'дня', 'вечера', 'ночи', 'по', 'местному', 'времени', 'около', 'примерно', 'где-то', 'числа', 'моя', 'из', 'дата', 'это', 'не', 'знаю', 'время']);

/** Фраза распознавания → дата (YYYY-MM-DD), время (HH:MM), строка места (как сказано). */
export function parseSpokenBirth(raw: string, now = new Date()): SpokenBirth {
  let t = fold(raw).replace(/[,!?;«»"]/g, ' ');
  const res: SpokenBirth = {};

  // Время-слова, которые иначе съест перевод числительных.
  let halfTime: string | undefined;
  const hm = HALF.exec(t);
  if (hm) {
    let h = HALF_H[hm[1]] - 1;
    if (/(дня|вечера)/.test(t) && h < 12 && (h <= 6 || /вечера/.test(t))) h += 12;
    halfTime = `${pad(h)}:30`; t = t.replace(hm[0], ' ');
  }
  if (/полдень|полудня/.test(t)) { halfTime = '12:00'; t = t.replace(/полдень|полудня/, ' '); }
  if (/полночь|полуночи/.test(t)) { halfTime = '00:00'; t = t.replace(/полночь|полуночи/, ' '); }

  t = wordsToDigits(t);

  // Дата: 15.03.1990 / 15-03-90, затем «15 марта 1990».
  let dm = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/.exec(t);
  if (dm) {
    res.date = validDate(fullYear(+dm[3], now), +dm[2], +dm[1]);
    t = t.replace(dm[0], ' ');
  } else {
    const words = t.split(/\s+/).filter(Boolean);
    for (let i = 1; i < words.length; i++) {
      const m = monthOf(words[i]);
      if (m === null || !/^\d{1,2}$/.test(words[i - 1])) continue;
      const y = /^\d{2,4}$/.test(words[i + 1] ?? '') ? +words[i + 1] : NaN;
      if (Number.isNaN(y)) continue;
      res.date = validDate(fullYear(y, now), m, +words[i - 1]);
      words.splice(i - 1, 3);
      t = words.join(' ');
      break;
    }
  }

  // Время: 14:30 / 14.30 / «14 30» / «7 утра» / «2 часа дня».
  if (halfTime) res.time = halfTime;
  else {
    const tm = /\b(\d{1,2})(?:\s*(?:час\S*))?(?:\s*[:.]?\s*(\d{2})(?:\s*минут\S*)?)?\s*(утра|дня|вечера|ночи)?(?=\s|$)/.exec(t);
    if (tm) {
      let h = +tm[1];
      const min = tm[2] ? +tm[2] : 0, part = tm[3];
      if ((part === 'дня' && h < 12 && h <= 6) || (part === 'вечера' && h < 12)) h += 12;
      if (part === 'ночи' && h === 12) h = 0;
      if (h <= 23 && min <= 59) { res.time = `${pad(h)}:${pad(min)}`; t = t.replace(tm[0], ' '); }
    }
  }

  const rest = t.split(/\s+/).filter((w) => w && !FILLER.has(w) && !/^\d+$/.test(w) && monthOf(w) === null);
  if (rest.length) res.place = rest.join(' ');
  return res;
}

// Падеж → основа: «Москве» → «москв», «Тбилиси» → «тбилис», «Нижнем» → «нижн».
const stem = (w: string): string => {
  const s = w.replace(/(ом|ем|ой|ей|ий|ый|ая|ое|ах|ях|е|и|у|а|ы|я|ю|о)$/, '');
  return s.length >= 2 ? s : w;
};
const foldPlace = (s: string): string[] => fold(s).replace(/-/g, ' ').replace(/[^a-zа-я0-9 ]/g, '').split(/\s+/).filter(Boolean);

/** Найти место по сказанному (любой падеж). База отсортирована по населению — берём первое совпадение. */
export function matchSpokenPlace(places: Place[], spoken: string): Place | undefined {
  const q = foldPlace(spoken).map(stem);
  if (!q.length) return undefined;
  // Сначала вся фраза, потом хвосты («я из Москвы» → «Москвы»).
  for (let from = 0; from < q.length; from++) {
    const part = q.slice(from);
    const hit = places.find((p) => [p.ru, p.name].some((n) => {
      const toks = foldPlace(n);
      return toks.length === part.length && toks.every((tk, i) => tk.startsWith(part[i]));
    }));
    if (hit) return hit;
  }
  return undefined;
}
