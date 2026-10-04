import { describe, it, expect } from "vitest";
import { cyc, STEMS, BRANCHES } from "../src/bazi/core";
import { computeChart, analyze, DEFAULT_VARIANT, type Chart } from "../src/bazi/calc";
import { taiyuan, minggong, xiaoyun } from "../src/bazi/oldschool";
const zh = (i: number) => STEMS[i % 10].zh + BRANCHES[i % 12].zh;
const fake = (year: [number, number], month: [number, number], hour: [number, number] | null, male = true, startAge = 3) => ({
  input: { male }, startAge,
  pillars: [...(hour ? [{ pos: "hour", stem: hour[0], branch: hour[1], idx: cyc(...hour) }] : []),
    { pos: "day", stem: 0, branch: 0, idx: 0 }, { pos: "month", stem: month[0], branch: month[1], idx: cyc(...month) },
    { pos: "year", stem: year[0], branch: year[1], idx: cyc(...year) }],
}) as unknown as Chart;

describe("старая школа: 胎元, 命宫, 小运 (KB 01)", () => {
  it("胎元: месяц 己亥 → 庚寅 (пример корпуса)", () => {
    expect(zh(taiyuan(fake([0, 0], [5, 11], null)))).toBe("庚寅");
  });
  it("命宫: год 甲, 3-й месяц, час 戌 → 丁卯 (СМ т.2)", () => {
    expect(zh(minggong(fake([0, 0], [8, 4], [4, 10]))!)).toBe("丁卯");
    expect(minggong(fake([0, 0], [8, 4], null))).toBeNull();
  });
  it("小运: мужчина 丙寅 вперёд, женщина 壬申 назад", () => {
    expect(xiaoyun(fake([0, 0], [2, 2], null, true, 3)).map((x) => zh(x.idx))).toEqual(["丙寅", "丁卯", "戊辰"]);
    expect(xiaoyun(fake([0, 0], [2, 2], null, false, 2)).map((x) => zh(x.idx))).toEqual(["壬申", "辛未"]);
  });
  it("天德/月德: у Владимира (месяц 亥) 月德 甲 — день и час, 天德 乙 нет", () => {
    const c = computeChart({ date: "1991-11-10", time: "00:37", timeKnown: true, tz: "Asia/Tbilisi", lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
    const s = analyze(c).stars;
    expect(s.find((x) => x.name === "Лунная добродетель")?.pos.sort()).toEqual(["day", "hour"]);
    expect(s.some((x) => x.name === "Небесная добродетель")).toBe(false);
    expect(s.find((x) => x.name === "Цветок персика")?.folk ?? "none").not.toBe("");
  });
});
