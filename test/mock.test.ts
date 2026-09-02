import { describe, it, expect } from 'vitest';
import { mockKp } from '../src/live/mock';

describe('live/mock — сборка без сети (§3.11)', () => {
  it('возвращает Computed без обращения в сеть, не бросает', async () => {
    const c = await mockKp();
    expect(c.value).not.toBeNull();
    expect(c.source).toContain('mock');
  });
});
