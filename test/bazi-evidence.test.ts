import { describe, it, expect } from 'vitest';
import { EVIDENCE, evTag, evSummary, EV_LABEL } from '../src/bazi/evidence';
import { CONF } from '../src/bazi/confidence';

describe('метки «что проверено»', () => {
  it('тексты — простым языком: без процентов, иероглифов и ссылок на книги', () => {
    for (const e of Object.values(EVIDENCE)) {
      expect(e.text).not.toMatch(/%|[一-鿿]|ДТС|т\.\s?\d/);
      expect(Object.keys(EV_LABEL)).toContain(e.status);
    }
  });
  it('то, что проверка опровергла, не помечено как проверенное', () => {
    expect(EVIDENCE.character.status).toBe('fail');
    expect(EVIDENCE.work.status).toBe('fail');
    expect(EVIDENCE.days.status).not.toBe('ok');
    expect(EVIDENCE.periods.status).not.toBe('ok');
  });
  it('«4 из 10» у полезных стихий совпадает с отложенной выборкой', () => {
    const [n, hit] = Object.values(CONF).reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    expect(EVIDENCE.yong.text).toContain(`${Math.round((hit / n) * 10)} случаях из 10`);
  });
  it('метка и сводка экранируют текст', () => {
    expect(evTag('days', '<x>')).toContain('&lt;x&gt;');
    expect(evSummary().match(/<li/g)!.length).toBe(Object.keys(EVIDENCE).length);
  });
});
