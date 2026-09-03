import { describe, it, expect } from 'vitest';
import { extractNumbers, inventedNumbers, buildContext } from '../src/live/ask';
import type { Value } from '../src/types';

const V = (over: Partial<Value>): Value => ({
  id: 'x', label: 'L', value: null, unit: '', tag: 'ОЦЕНКА', source: 'src',
  status: 'ok', verification: 'unverified', computedAt: 0, explain: '', ...over,
});
const nums = (s: string) => extractNumbers(s).map((t) => t.value);

describe('extractNumbers: парсинг форматов', () => {
  it('запятая-десятичная + пробел-разряды тысяч склеиваются в одно число', () => {
    expect(nums('45,2° и 380 000 лет')).toEqual([45.2, 380000]);
  });
  it('научная нотация парсится, а не рвётся на мантиссу', () => {
    expect(nums('поток 6.5e10 частиц')).toEqual([6.5e10]);
  });
});

describe('числовой пост-фильтр: чистые ответы', () => {
  it('число из входа, округлённое моделью, проходит', () => {
    const values = [V({ value: 45.23, unit: '°' })];
    expect(inventedNumbers('Солнце примерно на 45° над горизонтом.', buildContext(values), values)).toEqual([]);
  });
  it('число из explain (показано пользователю) проходит', () => {
    const values = [V({ text: 'созвездие Лев', explain: 'прецессия сдвинула небо на ~24° за 2000 лет' })];
    expect(inventedNumbers('Небо ушло на 24 градуса.', buildContext(values), values)).toEqual([]);
  });
});

describe('числовой пост-фильтр: ловит выдумки (классы из ревью)', () => {
  const bare = [V({ value: 45.23, unit: '°' })];
  const ctx = () => buildContext(bare);

  it('простое выдуманное число', () => {
    expect(inventedNumbers('Аура резонирует на 528 герц.', ctx(), bare).length).toBeGreaterThan(0);
  });
  it('B: большой «счётчик» больше не тривиален (сдвиг на 2000 лет)', () => {
    expect(inventedNumbers('Твой знак сместился на 2500 лет.', ctx(), bare).length).toBeGreaterThan(0);
  });
  it('C: близкое к большому входному, но вне точности — карантин', () => {
    const big = [V({ value: 380000 })];
    expect(inventedNumbers('Около 385000 километров.', buildContext(big), big).length).toBeGreaterThan(0);
  });
  it('A: научная нотация выдуманной величины ловится', () => {
    expect(inventedNumbers('Расстояние 4.2e8 метров.', ctx(), bare).length).toBeGreaterThan(0);
  });
  it('A/fail-closed: дробь/отношение → принудительный карантин', () => {
    expect(inventedNumbers('Вероятность 3/4 неба.', ctx(), bare).length).toBeGreaterThan(0);
  });
  it('A/fail-closed: верхний индекс (степень) → карантин', () => {
    expect(inventedNumbers('Порядка 10²³ частиц.', ctx(), bare).length).toBeGreaterThan(0);
  });
  it('G: знак учитывается (−47 ≠ 47)', () => {
    const v = [V({ value: 47, unit: '°' })];
    expect(inventedNumbers('Наклон −47 градусов.', buildContext(v), v).length).toBeGreaterThan(0);
  });
});

describe('§3.7 приватность', () => {
  it('строки-координаты выкидываются из контекста', () => {
    const values = [
      V({ label: 'Широта', value: 41.7, explain: 'твоя широта' }),
      V({ label: 'Высота Солнца', value: 45.2, unit: '°', explain: 'где Солнце сейчас' }),
    ];
    const ctx = buildContext(values);
    expect(ctx).not.toMatch(/широт|41[.,]7/i);
    expect(ctx).toMatch(/Высота Солнца/);
  });
});
