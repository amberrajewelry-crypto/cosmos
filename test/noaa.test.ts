import { describe, it, expect, vi } from 'vitest';
import { parseKp, fetchKp } from '../src/live/noaa';

describe('live/noaa — Kp, слой не бросает (§3.2)', () => {
  it('parseKp: реальный формат NOAA (массив объектов {Kp})', () => {
    const rows = [{ time_tag: 'a', Kp: 2 }, { time_tag: 'b', Kp: 1 }];
    expect(parseKp(rows)).toBe(1);
  });
  it('parseKp: исторический формат (массив массивов)', () => {
    const rows = [['time_tag', 'kp'], ['2026-09-03 09:00', '4']];
    expect(parseKp(rows)).toBe(4);
  });
  it('parseKp на мусоре → null (не бросает)', () => {
    expect(parseKp(null)).toBeNull();
    expect(parseKp([{ nope: 1 }])).toBeNull();
  });
  it('fetchKp при падении сети → value:null, НЕ бросает', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const c = await fetchKp(1_000_000); // свежий now, мимо кэша
    expect(c.value).toBeNull();
    expect(c.source).toBe('NOAA SWPC'); // оба источника упали — последним был fallback
    vi.unstubAllGlobals();
  });
  it('fetchKp: прокси GFZ отдаёт kp → источник GFZ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ kp: 2.333, source: 'GFZ Potsdam' }) }));
    const c = await fetchKp(2_000_000_000);
    expect(c.value).toBe(2.333);
    expect(c.source).toBe('GFZ Potsdam');
    vi.unstubAllGlobals();
  });
});
