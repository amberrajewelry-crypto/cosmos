import { describe, it, expect } from "vitest";
import { computeChart, analyze, DEFAULT_VARIANT } from "../src/bazi/calc";
const run = (date: string, time: string, male = true) => analyze(computeChart({ date, time, timeKnown: true, tz: "Asia/Tbilisi", lat: 41.7, lon: 44.8, male }, DEFAULT_VARIANT)).brain;

describe("мозг: структура и полезный бог по классике", () => {
  it("甲 в 亥, Огня 3%: 用 Огонь (调候), 喜 Земля, 忌 Вода и Дерево — как my-chart.md", () => {
    const b = run("1991-11-10", "00:37");
    expect([b.yong, ...b.xi]).toEqual([1, 2]);
    expect(b.ji).toEqual([4, 0]);
    expect(b.frame.zh).toBe("偏印格");
    expect(b.steps.map((s) => s.title).join()).toMatch(/调候/);
  });
  it("乙 в 卯 с Богатством: 建禄格, сильный, 用 Металл (Чиновник), Дерево — болезнь", () => {
    const b = run("1975-03-20", "15:30", false);
    expect(b.frame.zh).toBe("建禄格");
    expect(b.power.key).toBe("strong");
    expect(b.yong).toBe(3);
    expect(b.steps.some((s) => s.title.includes("病药"))).toBe(true);
  });
  it("летом Вода и зимой Огонь никогда не во вреде", () => {
    for (const d of ["1985-07-15", "1990-06-20", "2000-01-01", "1979-12-25"]) {
      const b = run(d, "12:00");
      expect(b.ji).not.toContain(d.slice(5, 7) <= "08" && d.slice(5, 7) >= "06" ? 4 : 1);
    }
  });
});

import { periodVerdict } from "../src/bazi/brain";
import { yearIdx } from "../src/bazi/calc";
describe("такт и год с союзами натала", () => {
  const c = computeChart({ date: "1991-11-10", time: "00:37", timeKnown: true, tz: "Asia/Tbilisi", lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
  const b = analyze(c).brain;
  it("2026 丙午: 丙 на своём корне 午 не превращается, только связан с 辛 — год хороший", () => {
    const v = periodVerdict(b, yearIdx(2026), c);
    expect(v.tone).toBe("good"); expect(v.text).toMatch(/贪合/);
  });
  it("такт 丙申: 丙 без корня, месяц 亥 — 丙辛 работает как Вода, такт тяжёлый", () => {
    const l = c.luck.find((x) => x.idx % 10 === 2 && x.idx % 12 === 8)!;
    const v = periodVerdict(b, l.idx, c);
    expect(v.tone).toBe("bad"); expect(v.text).toMatch(/Вода/);
  });
  it("2029 己: союз с господином дня — не вред", () => {
    expect(periodVerdict(b, yearIdx(2029), c).text).toMatch(/господином дня/);
  });
  it("сила Владимира по шкале классики — «слегка сильный», как в my-chart.md", () => {
    expect(analyze(c).strength).toBe("слегка сильный");
  });
});
