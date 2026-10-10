import { describe, it, expect } from 'vitest';
import { monthIdxAt, jianchu, jcHint } from '../src/bazi/days';

// Эталон — lunar-python getZhiXing (независимый код); 730 дней 2026–2027 совпали 10.10.2026, здесь — контрольные даты, включая дни смены месяца.
const N = '建除满平定执破危成收开闭';
const jc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number), t = Date.UTC(y, m - 1, d);
  const idx = ((Math.round((t - Date.UTC(2000, 0, 1)) / 864e5) + 54) % 60 + 60) % 60;
  return N[jianchu(monthIdxAt(new Date(Date.UTC(y, m - 1, d, 15, 59))), idx)];
};
describe('建除十二神', () => {
  it('совпадает с китайским календарём', () => {
    expect(jc('2026-10-08')).toBe('执'); // 寒露: 叠两值日
    expect(jc('2026-10-09')).toBe('破');
    expect(jc('2026-10-10')).toBe('危');
    expect(jc('2026-10-13')).toBe('开');
    expect(jc('2026-10-17')).toBe('满');
  });
  it('в день нагрузки «действенные» типы скрыты', () => {
    expect(jcHint({ jc: 2, type: 'heavy' })).toBeNull();
    expect(jcHint({ jc: 1, type: 'heavy' })).toContain('убрать лишнее');
    expect(jcHint({ jc: 11, type: 'calm' })).toContain('новое не открывать');
  });
});
