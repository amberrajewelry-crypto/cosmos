import { describe, it, expect } from "vitest";
import { computeChart, analyze, lichun, DEFAULT_VARIANT } from "../src/bazi/calc";
import { yearForecast, decade, pillarZh, baziYear } from "../src/bazi/forecast";
import { monthIdxAt } from "../src/bazi/days";
const c = computeChart({ date: "1991-11-10", time: "00:37", timeKnown: true, tz: "Asia/Tbilisi", lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
const a = analyze(c);

describe("год по месяцам и десятилетие", () => {
  it("2026 丙午: 12 месяцев от 立春, 庚寅…辛丑, столпы идут подряд и совпадают с календарём дней", () => {
    const y = yearForecast(c, a, 2026);
    expect(pillarZh(y.idx)).toBe("丙午");
    expect(y.months).toHaveLength(12);
    expect(y.months[0].start.getTime()).toBe(lichun(2026).getTime());
    expect(pillarZh(y.months[0].idx)).toBe("庚寅");
    expect(pillarZh(y.months[11].idx)).toBe("辛丑");
    y.months.forEach((m, i) => {
      if (i) expect(m.idx).toBe((y.months[i - 1].idx + 1) % 60);
      expect(monthIdxAt(new Date(m.start.getTime() + 864e5))).toBe(m.idx);
    });
    expect(y.months[0].hits.join()).toMatch(/доме, паре/);   // 寅 бьёт 申 дня
    expect(y.luck?.from).toBeLessThanOrEqual(2026);
  });
  it("десять лет подряд, у каждого года есть дело и подробности", () => {
    const d = decade(c, a, 2026);
    expect(d.map((x) => x.year)).toEqual([...Array(10).keys()].map((i) => 2026 + i));
    expect(d.every((x) => x.act.length > 10 && Array.isArray(x.detail))).toBe(true);
    expect(d.find((x) => x.year === 2034)!.hits.join()).toMatch(/доме, паре/);  // 甲寅 бьёт 申
  });
  it("год бацзы меняется в Личунь", () => {
    expect(baziYear(new Date(Date.UTC(2027, 1, 1)))).toBe(2026);
    expect(baziYear(new Date(Date.UTC(2027, 1, 10)))).toBe(2027);
  });
});
