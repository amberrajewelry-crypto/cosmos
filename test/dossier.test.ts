import { describe, expect, it } from 'vitest';
import { dossier, solarCycle } from '../src/natal/dossier';

const birth = new Date('1991-11-10T10:30:00Z'), now = new Date('2026-09-14T12:00:00Z');

describe('досье по реальным данным', () => {
  it('солнечный цикл: 1991 — 22-й около максимума, 2026 — 25-й', () => {
    expect(solarCycle(birth)?.n).toBe(22); expect(solarCycle(now)?.n).toBe(25);
    expect(solarCycle(new Date('1950-01-01'))).toBeNull();
  });
  it('без места — 8 пунктов (APOD с 1995), с местом — 9; у каждого тег и источник', () => {
    const a = dossier(birth, now), b = dossier(birth, now, { lat: 41.7, lon: 44.8 });
    expect(a.length).toBe(8); expect(b.length).toBe(9);
    for (const i of b) { expect(['ТОЧНО', 'ОЦЕНКА']).toContain(i.tag); expect(i.source.length).toBeGreaterThan(3); expect(i.text.length).toBeGreaterThan(20); }
  });
  it('Марс сейчас — 1.772 а.е. (Horizons 2026-09-14 12:00 UTC)', () => {
    const t = dossier(birth, now).find((i) => i.title.startsWith('Марс'))!.text;
    expect(t).toMatch(/сейчас — 265/); // 1.77216798 а.е. = 265.1 млн км
  });
  it('обороты вокруг Солнца ≈ возраст', () => {
    expect(dossier(birth, now).find((i) => i.title.startsWith('Сколько'))!.text).toMatch(/^34,8 оборота/);
  });
  it('будущее не в прошлом; APOD только с 1995', () => {
    const t = dossier(birth, now).find((i) => i.title.startsWith('Когда'))!.text;
    expect(t).toMatch(/Марс вернётся .* 20(2[6-9]|3\d)/);
    expect(dossier(birth, now).some((i) => i.title === 'Снимок дня')).toBe(false);
    expect(dossier(new Date('2001-05-05T00:00:00Z'), now).some((i) => i.title === 'Снимок дня')).toBe(true);
  });
});
