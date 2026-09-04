import { describe, it, expect } from 'vitest';
import { createBodyParticles, createStarfield } from '../src/scene/particles';

describe('scene/particles — человек из звёзд (§4.1)', () => {
  it('генерирует точки в габаритах стоящей фигуры', () => {
    const pts = createBodyParticles(1000);
    const pos = pts.geometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(500);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      expect(Math.abs(x)).toBeLessThanOrEqual(0.5);   // размах рук
      expect(y).toBeGreaterThanOrEqual(0.05);          // стопы
      expect(y).toBeLessThanOrEqual(1.7);              // макушка
      expect(Math.abs(z)).toBeLessThanOrEqual(0.2);    // толщина
    }
  });

  it('форма человекоподобна: есть точки в зоне головы и в зоне ног', () => {
    const pos = createBodyParticles(3000).geometry.getAttribute('position');
    let head = 0, legs = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 1.4) head++;      // голова ~1.52
      if (y < 0.4) legs++;      // голени
    }
    expect(head).toBeGreaterThan(0);
    expect(legs).toBeGreaterThan(0);
  });

  it('раскраска использует палитру происхождения (есть индиго и золото)', () => {
    const col = createBodyParticles(1000).geometry.getAttribute('color');
    let indigo = 0, gold = 0;
    for (let i = 0; i < col.count; i++) {
      if (col.getZ(i) > 0.7 && col.getX(i) < 0.5) indigo++;   // индиго: высокий B
      if (col.getX(i) > 0.7 && col.getZ(i) < 0.5) gold++;     // золото: высокий R, низкий B
    }
    expect(indigo).toBeGreaterThan(0);
    expect(gold).toBeGreaterThan(0);
  });

  it('звёздный фон — точки далеко позади сцены', () => {
    const pos = createStarfield(200).geometry.getAttribute('position');
    expect(pos.count).toBe(200);
    let behind = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getZ(i) < 0) behind++;
    expect(behind).toBe(200); // весь фон за камерой-объектом (z<0)
  });
});
