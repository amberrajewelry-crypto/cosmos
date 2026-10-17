import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { pillarName } from '../src/bazi/core';
const pn = (i: any) => ({ date: i[0], time: i[1], timeKnown: true, tz: i[2], lat: i[3], lon: i[4], male: true });
const chart = (i: any, v = DEFAULT_VARIANT) => computeChart(pn(i), v).pillars.map((p) => pillarName(p.idx)).join(' ');
describe('bazi calendar', () => {
  it('Брюс Ли 1940-11-27 07:12 Сан-Франциско', () => expect(chart(['1940-11-27', '07:12', 'America/Los_Angeles', 37.77, -122.42])).toBe('戊辰 甲戌 丁亥 庚辰'));
  it('Эйнштейн 1879-03-14 11:30 Ульм', () => expect(chart(['1879-03-14', '11:30', 'Europe/Berlin', 48.4, 9.99])).toBe('甲午 丙申 丁卯 己卯'));
  it('Мао 1893-12-26 07:30 Шаошань (поясное)', () => expect(chart(['1893-12-26', '07:30', 'Asia/Shanghai', 27.9, 112.5], { solar: false, zi: '23', south: false })).toBe('甲辰 丁酉 甲子 癸巳'));
  it('2000-01-01 12:00 = день 戊午, год 己卯', () => expect(chart(['2000-01-01', '12:00', 'Asia/Shanghai', 39.9, 116.4])).toMatch(/戊午 丙子 己卯$/));
  it('Личунь: 2000-02-04 20:30 Пекин ещё 己卯, 21:00 уже 庚辰', () => {
    expect(chart(['2000-02-04', '20:30', 'Asia/Shanghai', 39.9, 116.4]).split(' ')[3]).toBe('己卯');
    expect(chart(['2000-02-04', '21:00', 'Asia/Shanghai', 39.9, 116.4]).split(' ')[3]).toBe('庚辰');
  });
  it('23:30: школа 23:00 сдвигает день, школа 00:00 — нет', () => {
    const a = chart(['2000-01-01', '23:30', 'Asia/Shanghai', 39.9, 116.4], { solar: false, zi: '23', south: false }).split(' ');
    const b = chart(['2000-01-01', '23:30', 'Asia/Shanghai', 39.9, 116.4], { solar: false, zi: '00', south: false }).split(' ');
    expect(a[1]).toBe('己未'); expect(b[1]).toBe('戊午'); expect(a[0]).toBe(b[0]);
  });
  it('анализ не падает', () => { const c = computeChart(pn(['1940-11-27', '07:12', 'America/Los_Angeles', 37.77, -122.42]), DEFAULT_VARIANT); const a = analyze(c); expect(a.consensus.length).toBeGreaterThan(0); console.log(c.startAge.toFixed(2), c.forward, a.strength, a.interactions.map(i=>i.label), a.stars.map(s=>s.name)); });
});
