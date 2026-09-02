import { describe, it, expect } from 'vitest';
import { toValue } from '../src/registry/registry';

describe('registry.toValue — тег из реестра (§1.6)', () => {
  it('неверифицированный параметр НЕ может быть [ТОЧНО]', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: 42, source: 'astronomy-engine', computedAt: 1 });
    expect(v.tag).not.toBe('ТОЧНО');       // до A4 — даунгрейд
    expect(v.tag).toBe('ОЦЕНКА');
    expect(v.verification).toBe('unverified');
    expect(v.unit).toBe('°');              // метаданные из реестра
    expect(v.status).toBe('ok');
  });
  it('null-значение → слой гаснет (status unavailable)', () => {
    const v = toValue({ id: 'sky.sun.altitude', value: null, source: 'astronomy-engine', computedAt: 1 });
    expect(v.status).toBe('unavailable');
  });
});
