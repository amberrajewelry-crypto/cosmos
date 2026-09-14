// Обратная связь (блок 7). §7.1: по умолчанию ни координат, ни даты рождения — только id параметра,
// результат и часовой пояс. Без идентификаторов, без cookies. Сбой сети никогда не ломает UI.
export type Feedback =
  | { kind: 'wrong'; id: string; shown: string; expected: string; source: string; inputs?: string }
  | { kind: 'clear'; id: string; ok: boolean }
  | { kind: 'check'; id: string; result: 'yes' | 'no' | 'unclear'; delta?: string }
  | { kind: 'question'; text: string; id?: string }
  | { kind: 'note'; text: string }
  | { kind: 'events'; counts: Record<string, number>; zoomMax: number; zoomMin: number };

const URL = '/api/fb';
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } };

export async function sendFeedback(fb: Feedback): Promise<boolean> {
  try {
    const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fb, tz: tz() }), keepalive: true });
    return r.ok;
  } catch { return false; }
}

// §7.2 пассивный уровень: счётчики за сессию, один beacon при уходе. Что смотрят, докуда зумят, что шерят.
const counts: Record<string, number> = {};
let zoomMax = 0, zoomMin = 0;
export function track(ev: string): void { counts[ev] = (counts[ev] ?? 0) + 1; }
export function trackZoom(level: number): void { zoomMax = Math.max(zoomMax, level); zoomMin = Math.min(zoomMin, level); }
export function flushEvents(): void {
  if (!Object.keys(counts).length && !zoomMax && !zoomMin) return;
  const body = JSON.stringify({ kind: 'events', counts, zoomMax, zoomMin, tz: tz() });
  try { navigator.sendBeacon?.(URL, new Blob([body], { type: 'application/json' })); } catch { /* no-op */ }
}
if (typeof addEventListener === 'function') addEventListener('pagehide', flushEvents);
