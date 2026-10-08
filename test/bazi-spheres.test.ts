import { describe, it, expect } from "vitest";
import { computeChart, analyze, DEFAULT_VARIANT } from "../src/bazi/calc";
import { spheres } from "../src/bazi/spheres";
const run = (date: string, time: string, male = true) => {
  const c = computeChart({ date, time, timeKnown: true, tz: "Asia/Tbilisi", lat: 41.7, lon: 44.8, male }, DEFAULT_VARIANT);
  return spheres(c, analyze(c), 2026);
};
// KB 12 §5, 13 §3, 14 §1: без смерти, «克», числа детей, диагнозов, патриархальных оценок.
const BANNED = /смерт|умр|гибел|克|бездет|вдов|развод неизбеж|рак |онколог|инвалид|\d+ (ребён|детей)/i;

describe("сферы жизни", () => {
  it("Владимир: шесть сфер, деньги и партнёр — Земля как главная полезная", () => {
    const s = run("1991-11-10", "00:37");
    expect(s.map((x) => x.key)).toEqual(["character", "career", "money", "love", "health", "family"]);
    const money = s.find((x) => x.key === "money")!, love = s.find((x) => x.key === "love")!;
    expect(money.lead).toMatch(/земля.*главная полезная/);
    expect(love.points.join(" ")).toMatch(/Годы встреч.*2028/);
    expect(love.notes[0].quote).toBe("用神即是财神，妻美而且富贵");
    expect(s.find((x) => x.key === "health")!.points.join(" ")).toMatch(/Холодная карта/);
  });
  it("женская карта — звезда Чиновник, цитата о равенстве карт", () => {
    const love = run("1975-03-20", "15:30", false).find((x) => x.key === "love")!;
    expect(love.how).toMatch(/для женщины — стихия статуса/);
    expect(love.lead).toMatch(/звезда партнёра — Металл/);
    expect(love.notes.map((n) => n.quote)).toContain("女命生克之理，与男命同");
  });
  it("200 карт: без запретных тем, у каждой сферы есть вывод, совет и источник", () => {
    for (let i = 0; i < 200; i++) {
      const d = new Date(Date.UTC(1940, 0, 1) + i * 137 * 864e5 + i * 3.7e6);
      const s = run(d.toISOString().slice(0, 10), `${String(i % 24).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`, i % 2 === 0);
      for (const x of s) {
        expect(x.lead.length).toBeGreaterThan(25);
        expect(x.points.length).toBeGreaterThan(0);
        expect(x.todo.length).toBeGreaterThan(20);
        expect(x.notes.every((n) => n.quote && n.src)).toBe(true);
        expect([x.lead, ...x.points, x.todo].join(" ")).not.toMatch(BANNED);
      }
    }
  });
});
