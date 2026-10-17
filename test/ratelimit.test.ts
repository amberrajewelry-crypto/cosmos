import { describe, it, expect } from 'vitest';
import { allow, ipOf } from '../scripts/ratelimit';

describe('ограничение частоты /api/*', () => {
  it('пускает max запросов за окно, потом 429, после окна снова', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allow('t1', '1.2.3.4', 3, 1000, t0 + i)).toBe(true);
    expect(allow('t1', '1.2.3.4', 3, 1000, t0 + 10)).toBe(false);
    expect(allow('t1', '5.6.7.8', 3, 1000, t0 + 10)).toBe(true); // другой адрес — свой счёт
    expect(allow('t2', '1.2.3.4', 3, 1000, t0 + 10)).toBe(true); // другой эндпоинт — свой счёт
    expect(allow('t1', '1.2.3.4', 3, 1000, t0 + 1001)).toBe(true);
  });
  it('адрес — из x-real-ip, иначе первый в x-forwarded-for', () => {
    expect(ipOf({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' })).toBe('9.9.9.9');
    expect(ipOf({ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' })).toBe('1.1.1.1');
    expect(ipOf(undefined)).toBe('unknown');
  });
});
