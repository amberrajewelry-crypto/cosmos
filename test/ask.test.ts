import { describe, it, expect } from 'vitest';
import { extractNumbers, inventedNumbers, buildContext } from '../src/live/ask';
import type { Value } from '../src/types';

const V = (over: Partial<Value>): Value => ({
  id: 'x', label: 'L', value: null, unit: '', tag: 'ОЦЕНКА', source: 'src',
  status: 'ok', verification: 'unverified', computedAt: 0, explain: '', ...over,
});

describe('числовой пост-фильтр «Спросить»', () => {
  it('вытаскивает числа с запятой, точкой и пробелом-разрядом', () => {
    expect(extractNumbers('45,2° и 380 000 лет')).toEqual([45.2, 380, 0]);
  });

  it('пропускает ответ, где все числа — из входных значений (± округление)', () => {
    const values = [V({ value: 45.23, unit: '°' })];
    const ctx = buildContext(values);
    expect(inventedNumbers('Солнце примерно на 45° над горизонтом.', ctx, values)).toEqual([]);
  });

  it('ловит выдуманное число, которого не было во входе', () => {
    const values = [V({ value: 45.23, unit: '°' })];
    const ctx = buildContext(values);
    expect(inventedNumbers('Твоя аура резонирует на 528 герц.', ctx, values)).toEqual([528]);
  });

  it('разрешает числа из пояснения (explain), а не только из value', () => {
    const values = [V({ value: null, text: 'созвездие Лев', explain: 'прецессия сдвинула небо на ~24° за 2000 лет' })];
    const ctx = buildContext(values);
    expect(inventedNumbers('Небо ушло на 24 градуса.', ctx, values)).toEqual([]);
  });

  it('не считает выдумкой годы и малые счётчики', () => {
    const values = [V({ value: 7 })];
    const ctx = buildContext(values);
    expect(inventedNumbers('В 2026 году было 3 события.', ctx, values)).toEqual([]);
  });

  it('координаты не попадают в контекст (§3.7)', () => {
    const values = [V({ label: 'Высота Солнца', value: 45.2, unit: '°', explain: 'где Солнце сейчас' })];
    const ctx = buildContext(values);
    expect(ctx).not.toMatch(/широт|долгот|latitude|longitude/i);
  });
});
