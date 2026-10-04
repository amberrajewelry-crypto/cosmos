import { describe, it, expect } from "vitest";
import { computeChart, analyze, DEFAULT_VARIANT } from "../src/bazi/calc";
import { combos, spheres } from "../src/bazi/spheres";
const chart = (date: string, time: string, male = true) =>
  computeChart({ date, time, timeKnown: true, tz: "Asia/Tbilisi", lat: 41.7, lon: 44.8, male }, DEFAULT_VARIANT);

describe("сочетания богов", () => {
  it("каждое сочетание с цитатой и источником KB, попадает в свою сферу", () => {
    for (const d of ["1991-11-10", "1985-03-02", "2000-07-21", "1970-12-30"]) {
      const c = chart(d, "12:00"), a = analyze(c), cs = combos(c, a), s = spheres(c, a, 2026);
      for (const k of cs) {
        expect(k.quote.length).toBeGreaterThan(2);
        expect(k.src).toMatch(/KB|ЦПЦЦ/);
        expect(s.find((x) => x.key === k.sphere)!.points[0]).toBeTruthy();
      }
    }
  });
  it("разные карты — разные сочетания", () => {
    const t = (d: string) => { const c = chart(d, "12:00"); return combos(c, analyze(c)).map((k) => k.title).join("|"); };
    expect(new Set(["1991-11-10", "1985-03-02", "2000-07-21", "1970-12-30"].map(t)).size).toBeGreaterThan(2);
  });
});
