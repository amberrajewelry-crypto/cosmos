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

describe('фон дня, пустота, 天克地冲, журнал', async () => {
  const { tianKeDiChong, periodVerdict } = await import('../src/bazi/brain');
  const { recordPath, aggregate } = await import('../scripts/journal-fn');
  const { confidence } = await import('../src/bazi/confidence');
  const c = computeChart({ date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
  const a = analyze(c);
  it('天克地冲: 甲子 против 庚午 — да, против 庚子 — нет', () => {
    expect(tianKeDiChong(0, 6)).toBe(true);   // 甲子 / 庚午
    expect(tianKeDiChong(0, 36)).toBe(false); // 甲子 / 庚子
  });
  it('день несёт фон такта и года, оценка 1..5', () => {
    const d = daysFrom(c, a, new Date(2026, 9, 6), 1)[0];
    expect(['good', 'bad', 'mixed', 'calm']).toContain(d.bg.year);
    expect(Math.abs(d.bg.adj)).toBeLessThanOrEqual(0.75);
    expect(d.score).toBeGreaterThanOrEqual(1); expect(d.score).toBeLessThanOrEqual(5);
  });
  it('пустота: ветвь есть в карте — 填实, нет — пустота (命理约言 空亡论)', () => {
    // у 甲申 пусты 午未; 未 есть в карте (辛未) → 丁未 (2027) заполняет, 午 нет → 甲午 пустой
    expect(periodVerdict(a.brain, 43, c).text).toContain('填实');
    expect(periodVerdict(a.brain, 30, c).text).toContain('пустоте');
  });
  it('уверенность — без «высокой»', () => {
    expect(['mid', 'low', 'vlow']).toContain(confidence(a).level);
  });
  it('журнал: путь записи и сводка', () => {
    const iso = new Date().toISOString().slice(0, 10);
    const p = recordPath({ h: 'abcdefabcdefabcd', iso, type: 'peak', score: 4, ans: 1 });
    expect(p).toBe(`j/abcdefabcdefabcd/${iso}/peak_4_1_-_-_-_-.txt`);
    expect(recordPath({ h: 'abcdefabcdefabcd', iso: '2020-01-01', type: 'peak', score: 4, ans: 1 })).toBeNull();
    expect(recordPath({ h: 'abc', iso, type: 'peak', score: 4, ans: 1 })).toBeNull();
    const g = aggregate([p!, `j/1111111111111111/${iso}/heavy_2_0_-_-_-_-.txt`]);
    expect(g.people).toBe(2); expect(g.type.peak.yes).toBe(1); expect(g.type.heavy.yes).toBe(0);
  });
});
