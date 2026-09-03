import { describe, it, expect } from 'vitest';
import { createBodyParticles } from '../src/scene/particles';

describe('scene/particles — точки внутри тела (§4.1)', () => {
  it('генерирует точки, все внутри капсулы тела', () => {
    const pts = createBodyParticles(1000);
    const pos = pts.geometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(500);
    // капсула: центр 0.85, полудлина 0.55, R 0.25 → все точки в пределах bounding-сферы
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const radial = Math.hypot(x, z);
      expect(radial).toBeLessThanOrEqual(0.26);
      expect(y).toBeGreaterThanOrEqual(0.3 - 0.26);
      expect(y).toBeLessThanOrEqual(1.4 + 0.26);
    }
  });
  it('раскраска использует палитру происхождения (есть индиго и золото)', () => {
    const col = createBodyParticles(1000).geometry.getAttribute('color');
    let indigo = 0, gold = 0;
    for (let i = 0; i < col.count; i++) {
      if (col.getZ(i) > 0.7 && col.getX(i) < 0.4) indigo++;   // индиго: высокий B, низкий R
      if (col.getX(i) > 0.6 && col.getZ(i) < 0.4) gold++;     // золото: высокий R, низкий B
    }
    expect(indigo).toBeGreaterThan(0);
    expect(gold).toBeGreaterThan(0);
  });
});
