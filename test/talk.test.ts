import { describe, it, expect } from 'vitest';
import { answerLocal } from '../src/ui/talk';
import { reading } from '../src/natal/interp';

const r = reading(new Date('1990-03-15T10:30:00Z'), 123.4);
const rNoTime = reading(new Date('1990-03-15T12:00:00Z'));

describe('answerLocal', () => {
  it('про карту без карты — просит дату', () => expect(answerLocal('какой у меня асцендент', null, [])?.[0]).toMatch(/когда и где ты родился/));
  it('асцендент', () => expect(answerLocal('какой у меня асцендент?', r, [])?.[0]).toMatch(/^Асцендент/));
  it('асцендент без времени — честно', () => expect(answerLocal('асцендент', rNoTime, [])?.[0]).toMatch(/^Дверь в мир/));
  it('Луна', () => expect(answerLocal('что про мою Луну', r, [])?.[0]).toMatch(/^Луна в /));
  it('фаза Луны раньше Луны', () => expect(answerLocal('какая фаза луны', r, [])?.[0]).toMatch(/^Фаза Луны/));
  it('судьба → узлы', () => expect(answerLocal('в чём моя судьба', r, [])?.[0]).toMatch(/^Узлы/));
  it('совет', () => expect(answerLocal('дай совет', r, [])?.[0]).toMatch(/^Наставление/));
  it('Марс', () => expect(answerLocal('расскажи про Марс', r, [])?.[0]).toMatch(/^Марс в /));
  it('небо — из skyLines', () => expect(answerLocal('что надо мной', r, ['Солнце в 20° над горизонтом.'])).toEqual(['Солнце в 20° над горизонтом.']));
  it('почему небо голубое — в ask', () => expect(answerLocal('почему небо голубое', r, [])).toBeNull());
  it('посторонний вопрос → null (уходит в ask)', () => expect(answerLocal('сколько весит нейтрино', r, [])).toBeNull());
  it('все ответы непустые', () => {
    for (const q of ['асцендент', 'луна', 'судьба', 'хозяин карты', 'главный аспект', 'стихии', 'совет', 'послание', 'Сатурн', 'Плутон'])
      expect(answerLocal(q, r, [])?.filter(Boolean).length, q).toBeGreaterThan(0);
  });
});
