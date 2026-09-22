import { describe, it, expect } from 'vitest';
import { skyLines, levelLine, kpLine, natalLines } from '../src/ui/oracle';
import { extractNumbers } from '../src/live/ask';
import type { Value } from '../src/types';

// Голос лица подчиняется тому же закону, что и «Спросить»: ни одного числа, которого нет во входных
// данных. Здесь это не фильтр, а свойство сборки — тест его и стережёт.
const v = (id: string, value: number | null, text?: string): Value => ({
  id: id as Value['id'], label: id, value, unit: '', tag: 'ТОЧНО', source: 'test',
  status: 'ok', verification: 'verified', computedAt: Date.now(), explain: '', text,
});

const SKY = [
  v('sky.sun.altitude', -12.4),
  v('sky.sun.constellation', null, 'Солнце сейчас в созвездии Девы, а гороскоп говорит «Весы».'),
  v('sky.moon.altitude', 31.7),
  v('sky.planets.above', 2),
  v('shadow.length', 1.8),
  v('magnetic.inclination', 61.0),
];

// Числа из реплики должны находиться среди чисел исходных значений (с округлением, как в тексте).
const allowed = (vals: Value[]): Set<string> => {
  const s = new Set<string>();
  for (const val of vals) {
    if (typeof val.value === 'number') {
      const a = Math.abs(val.value);
      for (const d of [0, 1, 2]) s.add(a.toFixed(d));
    }
    for (const t of extractNumbers(val.text ?? '')) s.add(Math.abs(t.value).toFixed(0));
  }
  return s;
};

describe('оракул: числа только из расчёта', () => {
  it('каждое число реплики есть во входных значениях', () => {
    const ok = allowed(SKY);
    for (const line of skyLines(SKY)) {
      for (const tok of extractNumbers(line)) {
        const n = Math.abs(tok.value);
        expect(
          [0, 1, 2].some((d) => ok.has(n.toFixed(d))) || n === 5, // «из пяти видимых» — константа текста
          `выдуманное число ${tok.text} в реплике: ${line}`,
        ).toBe(true);
      }
    }
  });

  it('значение без данных не порождает реплику', () => {
    const lines = skyLines([{ ...v('sky.sun.altitude', null), status: 'unavailable' }]);
    expect(lines).toHaveLength(0);
  });

  it('Солнце под горизонтом → тень Земли, над горизонтом → прямой свет', () => {
    expect(skyLines([v('sky.sun.altitude', -12.4)])[0]).toContain('в тени Земли');
    expect(skyLines([v('sky.sun.altitude', 12.4)])[0]).toContain('напрямую');
  });

  it('склонение числительных', () => {
    const l = (n: number) => skyLines([v('sky.planets.above', n)])[0];
    expect(l(1)).toContain('1 планета');
    expect(l(2)).toContain('2 планеты');
    expect(l(5)).toContain('5 планет');
    expect(l(0)).toContain('Ни одной');
  });

  it('спокойное поле молчит, буря говорит', () => {
    expect(kpLine(2.3)).toBeNull();
    expect(kpLine(5.7)).toContain('5.7');
  });

  it('карта рождения: без времени — без асцендента, и всегда оговорка про традицию', () => {
    const noAsc = natalLines('В день рождения Солнце было в созвездии Змееносца.');
    expect(noAsc.some((l) => l.includes('асцендент'))).toBe(false);
    expect(noAsc.at(-1)).toContain('традиция');
    expect(natalLines('факт', 123.45).some((l) => l.includes('123.5'))).toBe(true);
  });

  it('несуществующий уровень масштаба не рождает пустую реплику', () => {
    expect(levelLine(999)).toBeNull();
  });
});
