import { describe, it, expect } from 'vitest';
import { toValue } from '../src/registry/registry';

describe('registry.toValue — тег из реестра (§1.6)', () => {
  it('верифицированный параметр получает [ТОЧНО]', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: 42, source: 'astronomy-engine', computedAt: 1 });
    expect(v.tag).toBe('ТОЧНО');            // A4 пройдена
    expect(v.verification).toBe('verified');
  });
  it('НЕверифицированный [ТОЧНО]-кандидат даунгрейдится до [ОЦЕНКА]', () => {
    const v = toValue({ id: 'sky.moon.altitude', value: 10, source: 'astronomy-engine', computedAt: 1 });
    expect(v.tag).toBe('ОЦЕНКА');           // diverged → не ТОЧНО
    expect(v.verification).toBe('diverged');
  });
  it('null-значение → слой гаснет (status unavailable)', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: null, source: 'astronomy-engine', computedAt: 1 });
    expect(v.status).toBe('unavailable');
  });
  it('категориальный факт: text пробрасывается в Value, status ok', () => {
    const v = toValue({ id: 'sky.sun.constellation', value: null, source: 'x', computedAt: 1, text: 'Солнце в Деве' });
    expect(v.text).toBe('Солнце в Деве');
    expect(v.status).toBe('ok');            // есть text → слой не гаснет
  });
});
