import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decanRuler, termOf, dateDeepHtml, signDeepHtml } from '../src/natal/datedeep';
import { SIGNS, SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN } from '../src/natal/interp/signs';
import { DIGNITY } from '../src/natal/interp/extras';

const cat = JSON.parse(readFileSync('public/stars.json', 'utf8'));
const url = (m: number, d: number) => `/natalnaya-karta/${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}/`;

describe('datedeep', () => {
  it('Chaldean faces: Aries I = Mars, Taurus I = Mercury, Pisces III = Mars', () => {
    expect(decanRuler(0, 0)).toBe('mars');
    expect(decanRuler(1, 0)).toBe('mercury');
    expect(decanRuler(11, 2)).toBe('mars');
  });
  it('Egyptian terms: Aries 0–6 Jupiter, Leo 12° Saturn, Pisces 29° Saturn', () => {
    expect(termOf(0, 3)).toEqual({ ruler: 'jupiter', from: 0, to: 6 });
    expect(termOf(4, 12).ruler).toBe('saturn');
    expect(termOf(11, 29.9).ruler).toBe('saturn');
  });
  it('Regulus sits on the Sun degree around Aug 23', () => {
    expect(dateDeepHtml(2026, 8, 23, cat, url)).toContain('Регул');
  });
  it('Capricorn I range starts in December, not January', () => {
    const h = dateDeepHtml(2026, 12, 25, cat, url);
    expect(h).toMatch(/Тот же декан: 2[0-3] декабря — [0-9]+ (декабря|января)/);
  });
  it('adds 250+ words per date', () => {
    const words = dateDeepHtml(2026, 5, 14, cat, url).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThan(250);
  });
  const sp = (i: number) => signDeepHtml(i, 2026, cat, url, SIGNS[i], SUN_IN_SIGN[i], MOON_IN_SIGN[i], ASC_IN_SIGN[i], DIGNITY);
  it('Leo page: Sun at home, Saturn in exile; Regulus already on Virgo 0° (since 2011)', () => {
    const h = sp(4);
    expect(h).toContain('<b>Солнце</b> в обители');
    expect(h).toContain('<b>Сатурн</b> в изгнании');
    expect(h).not.toContain('Регул');
    expect(sp(5)).toMatch(/<b>Регул<\/b> — 0° Девы/);
  });
  it('Capricorn decan I starts in December; every sign page adds 350+ words', () => {
    expect(sp(9)).toMatch(/1-й декан \(0–10°\), лицо Юпитера<\/b>, <a [^>]+>2[0-3] декабря/);
    for (let i = 0; i < 12; i++) expect(sp(i).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length).toBeGreaterThan(350);
  });
});

import { directionReading } from '../src/natal/interp/time';
describe('symbolic directions', () => {
  it('directed Sun conjuncts natal Venus when age equals the arc between them', () => {
    const natal = [
      { key: 'sun', glyph: '☉', name: 'Солнце', lon: 10 },
      { key: 'venus', glyph: '♀', name: 'Венера', lon: 40 },
    ];
    const hits = directionReading(natal, 30.2, undefined);
    expect(hits[0].head).toContain('Солнце дирекции');
    expect(hits[0].kind).toBe('c');
    expect(hits[0].text).toContain('Венере');
    expect(directionReading(natal, 25, undefined).length).toBe(0);
  });
});

import { solarAspects, SOLAR_MARS } from '../src/natal/interp/time';
describe('solar return', () => {
  it('12 Mars-of-the-year texts; solar Venus on natal Moon reads as «Венера соляра»', () => {
    expect(SOLAR_MARS).toHaveLength(12);
    const natal = [{ key: 'moon', glyph: '☽', name: 'Луна', lon: 100 }];
    const solar = [{ key: 'venus', glyph: '♀', name: 'Венера', lon: 101.5 }, { key: 'sun', glyph: '☉', name: 'Солнце', lon: 100 }];
    const h = solarAspects(natal, solar);
    expect(h).toHaveLength(1);
    expect(h[0].text).toMatch(/^Венера соляра на Луне/);
  });
});
