import { describe, it, expect } from "vitest";
import { computeChart, analyze, DEFAULT_VARIANT } from "../src/bazi/calc";
import { compat } from "../src/bazi/compat";
const ch = (date: string, time: string, male: boolean) => {
  const c = computeChart({ date, time, timeKnown: true, tz: "Asia/Tbilisi", lat: 41.7, lon: 44.8, male }, DEFAULT_VARIANT);
  return [c, analyze(c)] as const;
};
describe("совместимость двух карт", () => {
  it("обе стороны, итог и без слов-запретов", () => {
    const [c1, a1] = ch("1991-11-10", "00:37", true), [c2, a2] = ch("1993-05-20", "14:00", false);
    const r = compat(c1, a1, c2, a2);
    expect(r.items[0].title).toBe("Что партнёр приносит вам");
    expect(r.items[1].title).toBe("Что вы приносите партнёру");
    expect(["good", "bad", "mixed"]).toContain(r.tone);
    expect(r.summary).not.toMatch(/нельзя|запрещ|克/);
    expect(r.spheres.map((x) => x.key)).toEqual(["home", "growth", "money"]);
    for (const k of ["home", "growth", "money"]) expect(r.items.some((i) => i.sphere === k)).toBe(true);
  });
  it("симметрия: поменять местами — те же находки по столпам дня", () => {
    const [c1, a1] = ch("1991-11-10", "00:37", true), [c2, a2] = ch("1990-02-20", "09:00", false);
    const t = (r: ReturnType<typeof compat>) => r.items.filter((i) => i.sphere === "home").map((i) => i.title).sort();
    expect(t(compat(c1, a1, c2, a2))).toEqual(t(compat(c2, a2, c1, a1)).map((x) => x));
  });
  it("союз ветвей дня 申+巳 даёт «в союзе»", () => {
    // 1991-11-10 день 甲申; ищем дату с ветвью дня 巳 (5): (8+5)%12===1
    const [c1, a1] = ch("1991-11-10", "00:37", true);
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(1992, 0, 1 + i)).toISOString().slice(0, 10);
      const [c2, a2] = ch(d, "12:00", false);
      if (c2.pillars.find((p) => p.pos === "day")!.branch === 5) {
        expect(compat(c1, a1, c2, a2).items.map((x) => x.title)).toContain("Дворцы партнёра в союзе");
        return;
      }
    }
    throw new Error("нет даты с 巳");
  });
});
