import { describe, it, expect } from "vitest";
import { computeChart, analyze, DEFAULT_VARIANT } from "../src/bazi/calc";
import { daysFrom } from "../src/bazi/days";
import { daysIcs } from "../src/bazi/ics";
describe(".ics лучших дней", () => {
  it("валидная структура, событие на весь день, строки ≤ 75 октетов", () => {
    const c = computeChart({ date: "1991-11-10", time: "00:37", timeKnown: true, tz: "Asia/Tbilisi", lat: 42.27, lon: 42.7, male: true }, DEFAULT_VARIANT);
    const days = daysFrom(c, analyze(c), new Date(2026, 9, 5), 60).filter((d) => d.type === "peak");
    const ics = daysIcs(days, "Владимир", new Date(Date.UTC(2026, 9, 4)));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(days.length);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:2026\d{4}\r\nDTEND;VALUE=DATE:2026\d{4}/);
    for (const l of ics.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });
});
