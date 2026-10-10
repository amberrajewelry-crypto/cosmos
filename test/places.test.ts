import { describe, expect, it, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fold, translit, findPlaces, placeLabel, placeDetail } from '../src/data/places';
import { fold as foldGen } from '../scripts/gen-places.mjs';

const DIR = path.resolve('public/places');

describe('база мест: функции', () => {
  it('fold одинаков в браузере и в сборщике шардов', () => {
    for (const s of ['Йошкар-Ола', 'Ёлки', 'São Paulo', 'Нью-Йорк', 'Orël', 'Sankt-Peterburg', 'Кутаиси (Имерети)'])
      expect(fold(s)).toBe(foldGen(s));
  });
  it('транслит под написание GeoNames', () => {
    expect(translit('Екатеринбург')).toContain('yekaterinburg');
    expect(translit('Зугдиди')).toContain('zugdidi');
    expect(translit('Moscow')).toEqual([]);
  });
});

describe('база мест: поиск по всей базе', () => {
  beforeAll(() => {
    if (!fs.existsSync(path.join(DIR, 'core.json'))) execFileSync('node', ['scripts/gen-places.mjs']);
    vi.stubGlobal('fetch', async (u: string) => {
      const f = path.join(DIR, u.replace(/^\/places\//, ''));
      return fs.existsSync(f) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) } : { ok: false, json: async () => [] };
    });
  });
  it('крупные города — первыми', async () => {
    expect((await findPlaces('москва'))[0].tz).toBe('Europe/Moscow');
    expect(placeLabel((await findPlaces('кутаиси'))[0])).toMatch(/^Кутаиси, .*Грузия$/);
  });
  it('исторические имена: Ленинград, Свердловск, Фрунзе', async () => {
    const l = (await findPlaces('ленинград'))[0];
    expect(l.ru).toBe('Санкт-Петербург'); expect(l.alias).toBe('Ленинград');
    expect((await findPlaces('свердловск'))[0].ru).toBe('Екатеринбург');
    expect((await findPlaces('фрунзе'))[0].cc).toBe('KG');
  });
  it('маленькие сёла СНГ и мелкие города мира находятся', async () => {
    const iv = await findPlaces('ивановка', 10);
    expect(iv.length).toBe(10);
    expect(new Set(iv.map(placeDetail)).size).toBeGreaterThan(8); // одноимённые различимы по району/области
    expect((await findPlaces('сачхере'))[0].cc).toBe('GE');
    expect((await findPlaces('Hallstatt'))[0].cc).toBe('AT');
  });
  it('пишут по-русски, а в базе только латиница — находит транслитом', async () => {
    const r = await findPlaces('hallstatt');
    expect(r.length).toBeGreaterThan(0);
  });
});
