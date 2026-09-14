import { describe, expect, it } from 'vitest';
import { searchPlaces, type Place } from '../src/data/places';
import { localToUtc } from '../src/compute/localtime';

const P: Place[] = [
  { name: 'Tbilisi', ru: 'Тбилиси', lat: 41.691, lon: 44.834, tz: 'Asia/Tbilisi', cc: 'GE' },
  { name: 'Moscow', ru: 'Москва', lat: 55.752, lon: 37.616, tz: 'Europe/Moscow', cc: 'RU' },
  { name: 'New York', ru: 'Нью-Йорк', lat: 40.714, lon: -74.006, tz: 'America/New_York', cc: 'US' },
];

describe('места рождения и местное время', () => {
  it('поиск по русскому и латинскому префиксу, ё=е, по второму слову', () => {
    expect(searchPlaces(P, 'тби')[0].name).toBe('Tbilisi');
    expect(searchPlaces(P, 'New')[0].ru).toBe('Нью-Йорк');
    expect(searchPlaces(P, 'york')[0].ru).toBe('Нью-Йорк');
    expect(searchPlaces(P, 'т')).toEqual([]);
  });
  it('местное время → UTC с историческим сдвигом (Москва 1990 лето = UTC+4)', () => {
    expect(localToUtc('1990-07-14', '12:00', 'Europe/Moscow').toISOString()).toBe('1990-07-14T08:00:00.000Z');
    expect(localToUtc('2026-01-10', '12:00', 'Asia/Tbilisi').toISOString()).toBe('2026-01-10T08:00:00.000Z');
    expect(localToUtc('2026-01-10', '12:00').toISOString()).toBe('2026-01-10T12:00:00.000Z');
  });
});
