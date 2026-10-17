/**
 * «Линия жизни»: фон каждого года жизни = такт (10 лет) + сам год. Только механика тонов periodVerdict —
 * слой «периоды» в evidence.ts «не проверено», на экране под ним стоит та же метка.
 */
import { periodVerdict } from './brain';
import { yearIdx, type Chart, type Analysis } from './calc';

export type LifePoint = { year: number; age: number; v: number };
const W: Record<'good' | 'bad' | 'mixed' | 'calm', number> = { good: 1, calm: 0.3, mixed: 0, bad: -1 };

export function lifeLine(c: Chart, a: Analysis, years = 80): LifePoint[] {
  const by = c.input?.date ? +c.input.date.slice(0, 4) : Math.round(c.luck[0].year - c.luck[0].age); // эталоны без даты — по первому такту
  const raw = Array.from({ length: years + 1 }, (_, age) => {
    const y = by + age;
    const L = [...c.luck].reverse().find((l) => y >= l.year);
    const dv = L ? W[periodVerdict(a.brain, L.idx, c).tone] : 0;
    const yv = W[periodVerdict(a.brain, yearIdx(y), c).tone];
    return { year: y, age, v: 0.6 * dv + 0.4 * yv };
  });
  // сглаживание по 3 годам: линия про фон, а не про отдельный год
  return raw.map((p, i) => {
    const w = raw.slice(Math.max(0, i - 1), i + 2);
    return { ...p, v: w.reduce((s, x) => s + x.v, 0) / w.length };
  });
}

/** SVG-график; без библиотек, ширина по контейнеру (viewBox). */
export function lifeLineSvg(pts: LifePoint[], nowYear: number, w = 640, h = 180): string {
  if (!pts.length) return '';
  const pad = 22, x = (i: number) => pad + (i / (pts.length - 1)) * (w - 2 * pad), y = (v: number) => h / 2 - v * (h / 2 - pad);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${d}L${x(pts.length - 1).toFixed(1)},${h / 2}L${x(0).toFixed(1)},${h / 2}Z`;
  const ni = pts.findIndex((p) => p.year === nowYear);
  const ticks = pts.filter((p) => p.age % 10 === 0).map((p) => `<text x="${x(p.age).toFixed(1)}" y="${h - 4}" text-anchor="middle">${p.age}</text>`).join('');
  const now = ni >= 0 ? `<line x1="${x(ni)}" x2="${x(ni)}" y1="${pad / 2}" y2="${h - pad}" class="ll-now"/><circle cx="${x(ni)}" cy="${y(pts[ni].v)}" r="5" class="ll-dot"/><text x="${x(ni)}" y="${pad / 2 + 2}" text-anchor="middle" class="ll-lbl">сейчас</text>` : '';
  return `<svg class="lifeline" viewBox="0 0 ${w} ${h}" role="img" aria-label="Линия жизни по годам: выше середины — благоприятный фон, ниже — нагрузка">
<defs><linearGradient id="llg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fc98a" stop-opacity=".45"/><stop offset=".5" stop-color="#5fc98a" stop-opacity="0"/><stop offset=".5" stop-color="#ef5a3c" stop-opacity="0"/><stop offset="1" stop-color="#ef5a3c" stop-opacity=".45"/></linearGradient></defs>
<line x1="${pad}" x2="${w - pad}" y1="${h / 2}" y2="${h / 2}" class="ll-mid"/><path d="${area}" fill="url(#llg)"/><path d="${d}" class="ll-line"/>${now}${ticks}</svg>`;
}
