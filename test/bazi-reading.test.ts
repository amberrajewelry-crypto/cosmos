import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { rootOf, axisNote, climateNote, bondNotes, comboNotes, luckDetail, portrait, strengthNote } from '../src/bazi/reading';

// 1991-11-10 00:37 Кутаиси: 甲子 甲申 己亥 辛未 — сверено с my-chart.md и KB 09 §5, KB 10 «Пример».
const c = computeChart({ date: '1991-11-10', time: '00:37', timeKnown: true, tz: 'Asia/Tbilisi', lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
const a = analyze(c);

describe('разбор по KB', () => {
  it('корни 甲: 亥 长生, 未 хранилище, 申 нет; инь в хранилище корня не имеет (ЦПЦЦ гл.3)', () => {
    expect(rootOf(0, 11)?.w).toBe(3);
    expect(rootOf(0, 7)?.w).toBe(2);
    expect(rootOf(0, 8)).toBeNull();
    expect(rootOf(1, 7)?.w).toBe(1);      // 乙 в 未: остаточная ци, не хранилище
    expect(rootOf(1, 10)).toBeNull();     // 乙 в 戌 — своей стихии нет
  });
  it('климат 甲-亥: 庚 и 丁 спрятаны → «两藏»', () => {
    const n = climateNote(c, a);
    expect(n.text).toContain('Гэн 庚 (Металл) — спрятан');
    expect(n.text).toContain('两藏');
  });
  it('ось месяца 亥: проступил только 甲 (своя стихия) → ось = Сова 壬, скрытая', () => {
    const n = axisNote(c, a);
    expect(n.godKey).toBe('PY');
    expect(n.text).toContain('не проступил');
  });
  it('два 甲 к одному 己 — ревнивый союз (ЦПЦЦ гл.5)', () => {
    expect(bondNotes(c, a).some((n) => n.title.startsWith('Ревнивый союз'))).toBe(true);
  });
  it('формулы и портрет не падают, сила объясняет корни', () => {
    expect(Array.isArray(comboNotes(c, a))).toBe(true);
    expect(strengthNote(c, a).text).toContain('Свинья');
    expect(portrait(c, a).length).toBeGreaterThanOrEqual(3);
  });
  it('такт 庚寅 (2072) бьёт ветвь дня 申 и ствол 甲 — 天克地冲', () => {
    const l = c.luck.find((x) => x.idx % 10 === 6 && x.idx % 12 === 2)!;
    expect(luckDetail(c, a, l.idx).join(' ')).toContain('天克地冲');
  });
});
