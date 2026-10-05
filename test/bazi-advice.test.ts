import { describe, it, expect } from "vitest";
import { computeChart, analyze, allVariants } from "../src/bazi/calc";
import { daysFrom, bestHours } from "../src/bazi/days";

const mk = (date: string, time: string, lat: number, lon: number, tz: string, male = true) => {
  const inp = { date, time, timeKnown: true, tz, lat, lon, male };
  const c = computeChart(inp, allVariants(inp)[0]);
  return { c, a: analyze(c) };
};

describe("подсказка дня (KB 17, today.py)", () => {
  it("карта Владимира: 05.10.2026 壬子 — нагрузка 2/5, лекарство Земля; 12.10 己未 — 4/5", () => {
    const { c, a } = mk("1991-11-10", "00:37", 42.27, 42.7, "Asia/Tbilisi");
    const ds = daysFrom(c, a, new Date(2026, 9, 5), 8);
    expect(ds[0].score).toBe(2); expect(ds[0].med).toBe(2); expect(ds[0].heal).toBe(true);
    expect(ds[7].score).toBe(4);
    expect(bestHours(a, ds[0], 4 - 44.79 / 15, 9, 25)).toEqual(["14:00–16:00", "16:00–18:00", "18:00–20:00"]);
  });
  it("любая карта: оценка 1–5, лекарство полезно, советы заполнены", () => {
    for (const [d, t, lat, lon, tz, m] of [["1985-03-21", "14:20", 55.75, 37.62, "Europe/Moscow", false], ["2001-07-08", "06:05", 40.71, -74.0, "America/New_York", true], ["1970-12-30", "23:40", -8.65, 115.2, "Asia/Makassar", false]] as const) {
      const { c, a } = mk(d, t, lat, lon, tz, m);
      for (const x of daysFrom(c, a, new Date(2026, 0, 1), 60)) {
        expect(x.score).toBeGreaterThanOrEqual(1); expect(x.score).toBeLessThanOrEqual(5);
        expect(x.add.theory.length).toBeGreaterThan(10);
        expect(bestHours(a, x).length).toBeLessThanOrEqual(3);
      }
    }
  });
});
