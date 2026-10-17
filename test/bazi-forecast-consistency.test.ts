import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { yearForecast, decade } from '../src/bazi/forecast';

// Метки стихий месяца/года («Огонь — полезно…») и тон берутся из одного набора 用/忌 (при силе «на грани» — сдвинутого).
// Раньше: «Земля — главное полезное» и рядом «одна стихия полезна, другая — нагрузка» (вычитка 60 карт, 08.10).
describe('прогноз: метки стихий не спорят с тоном', () => {
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p2 = (n: number) => String(n).padStart(2, '0');
  it('80 случайных карт: год, 12 месяцев, 10 лет', () => {
    let n = 0;
    for (let i = 0; i < 80; i++) {
      const c = computeChart({ date: `${1945 + Math.floor(rnd() * 65)}-${p2(1 + Math.floor(rnd() * 12))}-${p2(1 + Math.floor(rnd() * 28))}`, time: `${p2(Math.floor(rnd() * 24))}:30`, timeKnown: true, tz: 'Europe/Moscow', lat: 55.75, lon: 37.62, male: i % 2 === 0 }, DEFAULT_VARIANT);
      const a = analyze(c), y = yearForecast(c, a, 2026);
      for (const p of [y, ...y.months, ...decade(c, a, 2026)]) {
        n++;
        if (p.text.startsWith('обе стихии периода вам полезны')) expect(p.why, p.text).not.toMatch(/нагрузка/);
        if (p.text.startsWith('обе стихии периода — нагрузка')) expect(p.why, p.text).not.toMatch(/полезн/);
        if (p.text.startsWith('одна стихия полезна')) { expect(p.why).toMatch(/полезн/); expect(p.why).toMatch(/нагрузка/); }
      }
    }
    expect(n).toBeGreaterThan(1500);
  });
});
