import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((p) => join(dir, p))
    .filter((p) => p.endsWith('.ts'));
}

describe('Инвариант §3.5 — одна система координат', () => {
  it('scene-слои не крутят координаты в обход coords.ts', () => {
    for (const f of filesUnder('src/scene')) {
      const s = readFileSync(f, 'utf8');
      const usesCoords = /altAzToXYZ|coords/.test(s);
      const rawAzimuthRotation = /\bazimuth\b|rotateY\([^)]*az/i.test(s);
      expect(usesCoords || !rawAzimuthRotation).toBe(true);
    }
  });
});

describe('Инвариант §3.7 — координаты пользователя не уходят в сеть', () => {
  it('нет fetch с lat/lon/birth в аргументах', () => {
    for (const f of filesUnder('src')) {
      const s = readFileSync(f, 'utf8');
      expect(/fetch\([^)]*\b(lat|lon|latitude|longitude|birth)\b/i.test(s)).toBe(false);
    }
  });
});
