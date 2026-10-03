import { describe, it, expect } from 'vitest';
import { parseSpokenBirth, wordsToDigits, matchSpokenPlace } from '../src/ui/voice-parse';
import type { Place } from '../src/data/places';

const NOW = new Date('2026-09-26T12:00:00Z');
const p = (s: string) => parseSpokenBirth(s, NOW);

describe('wordsToDigits', () => {
  it.each([
    ['тысяча девятьсот девяностого', '1990'],
    ['две тысячи пятого', '2005'],
    ['двухтысячного', '2000'],
    ['двадцать пятого', '25'],
    ['четырнадцать тридцать', '14 30'],
    ['пятнадцатого марта', '15 марта'],
    ['третьего', '3'],
    ['в семь утра', 'в 7 утра'],
  ])('%s → %s', (a, b) => expect(wordsToDigits(a)).toBe(b));

  it('города не превращаются в числа', () => {
    expect(wordsToDigits('в пятигорске')).toBe('в пятигорске');
    expect(wordsToDigits('одинцово')).toBe('одинцово');
  });
});

describe('parseSpokenBirth', () => {
  it.each([
    ['15 марта 1990 года в 14:30 в Тбилиси', { date: '1990-03-15', time: '14:30', place: 'тбилиси' }],
    ['пятнадцатого марта тысяча девятьсот девяностого года в четырнадцать тридцать Москва', { date: '1990-03-15', time: '14:30', place: 'москва' }],
    ['родилась 3 мая 1985 в 7 утра в Санкт-Петербурге', { date: '1985-05-03', time: '07:00', place: 'санкт-петербурге' }],
    ['12.07.2001 в 22:05 Кутаиси', { date: '2001-07-12', time: '22:05', place: 'кутаиси' }],
    ['1 января 90 в 2 часа дня', { date: '1990-01-01', time: '14:00' }],
    ['двадцать пятого декабря две тысячи пятого года в полтретьего', { date: '2005-12-25', time: '02:30' }],
    ['9 февраля 1977 в 11 вечера в Нижнем Новгороде', { date: '1977-02-09', time: '23:00', place: 'нижнем новгороде' }],
    ['4 октября 1999 в полдень', { date: '1999-10-04', time: '12:00' }],
    ['8 августа 2010 года время не знаю в Баку', { date: '2010-08-08', place: 'баку' }],
    ['17 июня 1968', { date: '1968-06-17' }],
  ])('%s', (s, want) => expect(p(s)).toEqual(want));

  it('несуществующая дата не проходит', () => expect(p('31 февраля 1990').date).toBeUndefined());
  it('только время (ответ на переспрос)', () => expect(p('в половине восьмого вечера').time).toBe('19:30'));
  it('только время цифрами', () => expect(p('в 18 45').time).toBe('18:45'));
});

const PLACES: Place[] = [
  { name: 'Moscow', ru: 'Москва', lat: 55.75, lon: 37.62, tz: 'Europe/Moscow', cc: 'RU' },
  { name: 'Saint Petersburg', ru: 'Санкт-Петербург', lat: 59.94, lon: 30.31, tz: 'Europe/Moscow', cc: 'RU' },
  { name: 'Tbilisi', ru: 'Тбилиси', lat: 41.69, lon: 44.83, tz: 'Asia/Tbilisi', cc: 'GE' },
  { name: 'Nizhniy Novgorod', ru: 'Нижний Новгород', lat: 56.33, lon: 44.0, tz: 'Europe/Moscow', cc: 'RU' },
  { name: 'Kazan', ru: 'Казань', lat: 55.79, lon: 49.12, tz: 'Europe/Moscow', cc: 'RU' },
  { name: 'Kutaisi', ru: 'Кутаиси', lat: 42.27, lon: 42.7, tz: 'Asia/Tbilisi', cc: 'GE' },
];

describe('matchSpokenPlace', () => {
  it.each([
    ['москве', 'Москва'], ['москвы', 'Москва'], ['тбилиси', 'Тбилиси'], ['санкт-петербурге', 'Санкт-Петербург'],
    ['нижнем новгороде', 'Нижний Новгород'], ['казани', 'Казань'], ['кутаиси', 'Кутаиси'], ['родилась в москве', 'Москва'],
  ])('%s → %s', (s, ru) => expect(matchSpokenPlace(PLACES, s)?.ru).toBe(ru));
  it('неизвестное — undefined', () => expect(matchSpokenPlace(PLACES, 'атлантида')).toBeUndefined());
});
