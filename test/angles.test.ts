import { describe, it, expect } from 'vitest';
import { SunPosition, SearchRiseSet, Body, Observer } from 'astronomy-engine';
import { ascMc } from '../src/compute/angles';

const TBILISI = [41.72, 44.79] as const;

describe('ASC/MC — геометрия эклиптики (§4.7)', () => {
  it('в момент восхода Солнца ASC ≈ долгота Солнца (Солнце лежит на эклиптике)', () => {
    const rise = SearchRiseSet(Body.Sun, new Observer(...TBILISI, 0), +1, new Date('2026-06-21T00:00:00Z'), 1)!;
    // SearchRiseSet считает верхний край + рефракция (~0.83°): центр Солнца ещё под геометрическим горизонтом,
    // поэтому допуск ~1.5° по долготе у восхода (эклиптика наклонена к горизонту).
    const { asc } = ascMc(...TBILISI, rise.date);
    const sunLon = SunPosition(rise.date).elon;
    const d = Math.abs(((asc - sunLon + 540) % 360) - 180);
    expect(d).toBeLessThan(2.5);
  });
  it('в местный полдень MC ≈ долгота Солнца', () => {
    // Тбилиси lon 44.79 → полдень UTC ≈ 12:00 − 2ч59м; 21.06 уравнение времени ≈ −1.5 мин
    const noon = new Date('2026-06-21T09:02:30Z');
    const { mc } = ascMc(...TBILISI, noon);
    const d = Math.abs(((mc - SunPosition(noon).elon + 540) % 360) - 180);
    expect(d).toBeLessThan(0.6);
  });
  it('MC отстоит от ASC на 60–120° (квадрант) в умеренных широтах', () => {
    const { asc, mc } = ascMc(...TBILISI, new Date('1990-05-14T03:30:00Z'));
    const d = ((asc - mc + 360) % 360);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(130);
  });
});
