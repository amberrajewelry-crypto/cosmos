// Local civil time at an IANA zone → UTC instant, via Intl (no library in the bundle).
const F: Record<string, Intl.DateTimeFormat> = {};
function fmt(tz: string): Intl.DateTimeFormat {
  return (F[tz] ??= new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }));
}
// Wall-clock in `tz` for instant `ms`, as a UTC-epoch number for arithmetic.
function wallAsUtc(ms: number, tz: string): number {
  const p = Object.fromEntries(fmt(tz).formatToParts(ms).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}
export function localToUtc(date: string, time: string, tz?: string): Date {
  const naive = new Date(`${date}T${time}:00Z`);
  if (!tz) return naive;
  try {
    // ponytail: two-pass offset fix; exact except inside a DST gap (then off by ≤1h).
    const n = naive.getTime();
    let guess = n - (wallAsUtc(n, tz) - n);
    guess = n - (wallAsUtc(guess, tz) - guess);
    return new Date(guess);
  } catch { return naive; }
}
