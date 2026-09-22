import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decanRuler, termOf, dateDeepHtml } from '../src/natal/datedeep';

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
});
