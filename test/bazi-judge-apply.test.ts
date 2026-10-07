import { describe, it, expect } from 'vitest';
import { computeChart, analyze, DEFAULT_VARIANT } from '../src/bazi/calc';
import { applyJudge } from '../src/bazi/calibrate';

const chart = () => computeChart({ date: '1991-11-10', time: '00:37', timeKnown: true, lat: 42.27, lon: 42.70, tz: 'Asia/Tbilisi', gender: 'm' } as any, DEFAULT_VARIANT);

describe('applyJudge — ответ второй проверки становится основным', () => {
  it('меняет полезную стихию, помощников, вредных и запоминает формулу', () => {
    const c = chart(), a = analyze(c), was = a.brain.yong, el = ((was + 1) % 5) as any;
    applyJudge(a, el);
    expect(a.brain.yong).toBe(el);
    expect(a.brain.formulaYong).toBe(was);
    expect(a.brain.ji).not.toContain(el);
    expect(a.brain.xi.some((e) => a.brain.ji.includes(e))).toBe(false);
    expect(a.consensus[0]).toBe(el);
    expect(a.avoid).toEqual(a.brain.ji);
    expect(a.brain.steps.at(-1)!.title).toBe('Вторая проверка');
  });
  it('согласие с формулой и повторный вызов ничего не меняют', () => {
    const c = chart(), a = analyze(c), was = a.brain.yong, xi = [...a.brain.xi];
    applyJudge(a, was);
    expect(a.brain.formulaYong).toBeUndefined();
    expect(a.brain.xi).toEqual(xi);
    const el = ((was + 2) % 5) as any; applyJudge(a, el); applyJudge(a, ((was + 3) % 5) as any);
    expect(a.brain.yong).toBe(el);
  });
});
