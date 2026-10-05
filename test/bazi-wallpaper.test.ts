import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { daysFrom } from '../src/bazi/days';
import { wallpaperSvg, wrap, tzOffsetH } from '../src/bazi/wallpaper';

describe('заставка «карта дня»', () => {
  const c = computeChart({ date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
  const a = analyze(c), days = daysFrom(c, a, new Date(2026, 9, 6), 9);
  it('SVG без иероглифов, с оценкой и датой', () => {
    const s = wallpaperSvg(a, days[0], days, 4 - 42.7 / 15);
    expect(s).toContain('6 октября, вторник');
    expect(s).toContain(`${days[0].score} из 5`);
    expect(s).not.toMatch(/[一-鿿]/);
  });
  it('перенос строк не длиннее ширины и с обрезкой', () => {
    const ls = wrap('слово '.repeat(60), 44, 995, 3);
    expect(ls).toHaveLength(3);
    expect(ls[2].endsWith('…')).toBe(true);
  });
  it('смещение пояса', () => {
    expect(tzOffsetH('Asia/Tbilisi', new Date('2026-10-06T00:00:00Z'))).toBe(4);
    expect(tzOffsetH('Asia/Kolkata', new Date('2026-10-06T00:00:00Z'))).toBe(5.5);
  });
});
