import { describe, it, expect } from 'vitest';
import { altAzToXYZ } from '../src/compute/coords';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('altAzToXYZ (§3.5)', () => {
  const R = 1;
  it('зенит → +Y при любом азимуте', () => {
    const p = altAzToXYZ(90, 123, R);
    expect(near(p.x, 0) && near(p.y, R) && near(p.z, 0)).toBe(true);
  });
  it('горизонт, Север (Az=0) → −Z', () => {
    const p = altAzToXYZ(0, 0, R);
    expect(near(p.x, 0) && near(p.y, 0) && near(p.z, -R)).toBe(true);
  });
  it('горизонт, Восток (Az=90) → +X', () => {
    const p = altAzToXYZ(0, 90, R);
    expect(near(p.x, R) && near(p.y, 0) && near(p.z, 0)).toBe(true);
  });
  it('горизонт, Юг (Az=180) → +Z', () => {
    const p = altAzToXYZ(0, 180, R);
    expect(near(p.z, R)).toBe(true);
  });
});
