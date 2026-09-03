import { describe, it, expect, vi } from 'vitest';
import { parseKp, fetchKp } from '../src/live/noaa';

describe('live/noaa — Kp, слой не бросает (§3.2)', () => {
  it('parseKp берёт последнюю строку', () => {
    const rows = [['time_tag', 'kp'], ['2026-09-03 06:00', '2'], ['2026-09-03 09:00', '4']];
    expect(parseKp(rows)).toBe(4);
  });
  it('parseKp на мусоре → null (не бросает)', () => {
    expect(parseKp(null)).toBeNull();
    expect(parseKp([['h']])).toBeNull();
  });
  it('fetchKp при падении сети → value:null, НЕ бросает', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const c = await fetchKp(1_000_000); // свежий now, мимо кэша
    expect(c.value).toBeNull();
    expect(c.source).toBe('NOAA SWPC');
    vi.unstubAllGlobals();
  });
});
