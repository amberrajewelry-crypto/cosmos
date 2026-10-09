// Календарь .ics из сильных дней: события на весь день, без сервера и подписок (RFC 5545).
import type { DayInfo } from './days';
import { DAY_TYPE } from './days';

const esc = (s: string) => s.replace(/[\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
// RFC 5545: строки не длиннее 75 октетов, перенос — CRLF + пробел.
const fold = (line: string) => {
  const out: string[] = []; let cur = '', n = 0;
  for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (n + b > 73) { out.push(cur); cur = ' '; n = 1; } cur += ch; n += b; }
  return [...out, cur].join('\r\n');
};

export function daysIcs(days: DayInfo[], who: string, stamp = new Date()): string {
  const dt = (iso: string) => iso.replace(/-/g, '');
  const next = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
  const now = stamp.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ev = days.map((d) => [
    'BEGIN:VEVENT', `UID:bazi-${dt(d.iso)}-${d.type}@astropro.tech`, `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dt(d.iso)}`, `DTEND;VALUE=DATE:${dt(next(d.iso))}`,
    `SUMMARY:${esc(`Бацзы: ${DAY_TYPE[d.type].ru} день — ${d.god.ru}`)}`,
    `DESCRIPTION:${esc(`${d.act}. ${DAY_TYPE[d.type].hint}.${d.notes.length ? ' ' + d.notes.join(' ') : ''}`)}`,
    'TRANSP:TRANSPARENT', 'END:VEVENT',
  ].map(fold).join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//astropro.tech//bazi//RU', 'CALSCALE:GREGORIAN', fold(`X-WR-CALNAME:${esc('Бацзы — ' + who)}`), ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
