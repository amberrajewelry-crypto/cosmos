import { describe, it, expect } from 'vitest';
import { toValue } from '../src/registry/registry';

describe('registry.toValue — тег из реестра (§1.6)', () => {
  it('верифицированный параметр получает [ТОЧНО]', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: 42, source: 'astronomy-engine', computedAt: 1 });
    expect(v.tag).toBe('ТОЧНО');            // A4 пройдена
    expect(v.verification).toBe('verified');
  });
  it('Луна после A4 (REFRACTED, Δ2.6″) — [ТОЧНО] verified', () => {
    const v = toValue({ id: 'sky.moon.altitude', value: 10, source: 'astronomy-engine', computedAt: 1 });
    expect(v.tag).toBe('ТОЧНО');
    expect(v.verification).toBe('verified');
  });
  it('неизвестный id → FALLBACK: не [ТОЧНО], unverified (даунгрейд структурный)', () => {
    const v = toValue({ id: 'nope.unknown' as never, value: 10, source: 'x', computedAt: 1 });
    expect(v.tag).not.toBe('ТОЧНО');
    expect(v.verification).toBe('unverified');
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

import { wrongNumberMailto } from '../src/ui/panel';
describe('«число неверно» (§7.11) и «где проверить» (§2.5)', () => {
  it('mailto содержит id и значение, verifyUrl пробрасывается из реестра', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: 12.5, source: 'astronomy-engine', computedAt: 0 });
    expect(v.verifyUrl).toContain('timeanddate');
    const m = wrongNumberMailto(v);
    expect(m.startsWith('mailto:')).toBe(true);
    expect(decodeURIComponent(m)).toContain('sky.sun.altitude');
    expect(decodeURIComponent(m)).toContain('12.5');
  });
});
