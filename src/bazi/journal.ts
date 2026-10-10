// Журнал «как прошёл день» (KB 17 §5 п.7): человек отмечает день «хорошо / тяжело», мы сравниваем с прогнозом.
// Свои ответы — в браузере (личная сводка), обезличенная копия — в /api/journal (общая проверка метода).
// Дата рождения не уходит: карта шифруется в хэш (SHA-256, 16 знаков).
import type { DayInfo } from './days';
import type { Confidence } from './confidence';

const KEY = 'bazi-journal';
export type Ans = 0 | 1;
interface Entry { ans: Ans; type: DayInfo['type']; score: number; sphere?: string }
type Store = Record<string, Record<string, Entry>>;

const load = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };

export async function chartHash(q: URLSearchParams): Promise<string> {
  const p = (q.get('p') ?? '').split(',');
  const s = [q.get('d'), q.get('t'), Number(p[0]).toFixed(2), Number(p[1]).toFixed(2), q.get('g')].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bazi:' + s));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Отмеченные дни карты — для сверки с жизнью (calibrate.ts). */
export const myDays = (h: string) => Object.entries(load()[h] ?? {}).map(([iso, e]) => ({ iso, good: e.ans === 1 }));

export function myAnswer(h: string, iso: string): Entry | undefined { return load()[h]?.[iso]; }

export async function answer(h: string, d: DayInfo, ans: Ans, conf: Confidence | null, sphere = '-'): Promise<boolean> {
  const st = load();
  (st[h] ??= {})[d.iso] = { ans, type: d.type, score: d.score, sphere };
  localStorage.setItem(KEY, JSON.stringify(st));
  try {
    const r = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ h, iso: d.iso, type: d.type, score: d.score, ans, luck: d.bg.luck ?? '-', year: d.bg.year, conf: conf?.level ?? '-', sphere }) });
    return r.ok;
  } catch { return false; }
}

const strongT = (t: string) => t === 'peak' || t === 'peak-hit';
/** Доля «хорошо» в сильные дни и в дни нагрузки — то, ради чего журнал (KB 17 §5). */
export function split(rows: { type: string; yes: number; n: number }[]) {
  const s = { n: 0, yes: 0 }, h = { n: 0, yes: 0 };
  for (const r of rows) { const x = strongT(r.type) ? s : r.type === 'heavy' ? h : null; if (x) { x.n += r.n; x.yes += r.yes; } }
  return { strong: s, heavy: h };
}

export function mySummary(h: string): string {
  const es = Object.values(load()[h] ?? {});
  if (!es.length) return '';
  const { strong, heavy } = split(es.map((e) => ({ type: e.type, yes: e.ans, n: 1 })));
  const of = (x: { n: number; yes: number }) => (x.n ? `${x.yes} из ${x.n}` : 'пока нет');
  const verdict = strong.n >= 5 && heavy.n >= 5
    ? (strong.yes / strong.n - heavy.yes / heavy.n >= 0.2 ? ' Пока прогноз для вас работает: сильные дни заметно лучше.' : ' Пока разницы между сильными и тяжёлыми днями почти нет — прогнозу дней для вас доверять рано.')
    : ' Нужно хотя бы по 5 сильных и тяжёлых дней, чтобы делать вывод.';
  return `Вы отметили дней: ${es.length}. «Хорошо» в сильные дни — ${of(strong)}, в дни нагрузки — ${of(heavy)}.${verdict}`;
}

export async function globalSummary(): Promise<string> {
  try {
    const r = await fetch('/api/journal'); if (!r.ok) return '';
    const j = await r.json() as { answers: number; people: number; type: Record<string, { k: string; n: number; yes: number }> };
    const { strong, heavy } = split(Object.values(j.type).map((x) => ({ type: x.k, yes: x.yes, n: x.n })));
    if (j.answers < 30 || strong.n < 10 || heavy.n < 10) return `Общая проверка метода: ответов пока ${j.answers} — для вывода нужно больше.`;
    const p = (x: { n: number; yes: number }) => Math.round((10 * x.yes) / x.n);
    return `Общая проверка: ${j.answers} ответов от ${j.people} человек. «Хорошо» в сильные дни — ${p(strong)} из 10, в дни нагрузки — ${p(heavy)} из 10.`;
  } catch { return ''; }
}

/** Слепой тест «узнаёте себя?» — ответ уходит один раз на карту. */
export async function sendRecog(h: string, hit: boolean): Promise<boolean> {
  try { const r = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'recog', v: 2, h, hit: hit ? 1 : 0 }) }); return r.ok; } catch { return false; }
}
export async function recogSummary(): Promise<string> {
  try {
    const r = await fetch('/api/journal'); if (!r.ok) return '';
    const j = await r.json() as { recog2?: { n: number; hit: number } }, x = j.recog2;
    if (!x || x.n < 30) return `Пока ответов ${x?.n ?? 0} — общий итог покажем после 30.`;
    return `Всего ответили ${x.n}: узнали себя ${Math.round((10 * x.hit) / x.n)} из 10. Если бы описания подходили всем одинаково, было бы около 3 из 10.`;
  } catch { return ''; }
}
