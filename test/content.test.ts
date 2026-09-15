import { describe, it, expect } from 'vitest';
import { CONTENT, contentValues } from '../src/registry/content';

const ctx = { when: new Date('2026-09-14T12:00:00Z'), lat: 41.7, lon: 44.8, massKg: 70, heightM: 1.7, ageYears: 30, kp: 3 };
const byId = (id: string) => contentValues(ctx).find((v) => v.id === id)!;

describe('контент-база (§2.3: 17 + 77 ≥ 92)', () => {
  it('77 параметров, 9 уровней, 7–9 на уровень, id уникальны', () => {
    expect(CONTENT.length).toBe(77);
    const per = Array.from({ length: 9 }, (_, l) => CONTENT.filter((p) => p.level === l).length);
    expect(Math.min(...per)).toBeGreaterThanOrEqual(7);
    expect(new Set(CONTENT.map((p) => p.id)).size).toBe(77);
  });
  it('все считаются при полном контексте (ни одного null)', () => {
    const bad = contentValues(ctx).filter((v) => v.status !== 'ok').map((v) => v.id);
    expect(bad).toEqual([]);
  });
  it('без места — гаснут ровно зависящие от координат', () => {
    const off = contentValues({ ...ctx, lat: undefined, lon: undefined }).filter((v) => v.status !== 'ok').map((v) => v.id).sort();
    expect(off).toEqual(['c.body.g', 'c.body.spin', 'c.gal.center', 'c.hor.day', 'c.hor.noon', 'c.hor.polaris', 'c.hor.refraction', 'c.mag.f']);
  });
  it('физика: g в Тбилиси 9.803, Полярная 41.7°, свет Солнца ~498–502 с, скорость Земли 29.3–30.3', () => {
    expect(byId('c.body.g').value).toBeCloseTo(9.803, 2);
    expect(byId('c.hor.polaris').value).toBe(41.7);
    expect(byId('c.orb.light').value).toBeGreaterThan(495); expect(byId('c.orb.light').value).toBeLessThan(505);
    expect(byId('c.orb.speed').value).toBeGreaterThan(29.2); expect(byId('c.orb.speed').value).toBeLessThan(30.4);
    expect(byId('c.hor.day').value).toBeGreaterThan(12); expect(byId('c.hor.day').value).toBeLessThan(13); // сентябрь, 41.7° с.ш.
    expect(byId('c.mag.f').value).toBeGreaterThan(45000); expect(byId('c.mag.f').value).toBeLessThan(52000);
  });
});
