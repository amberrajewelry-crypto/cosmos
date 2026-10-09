// Текст утреннего уведомления «мой день» (Web Push, tools/push_worker.ts). Тот же расчёт, что у заставки (scripts/zastavka-fn.ts).
import { computeChart, analyze, DEFAULT_VARIANT } from './calc';
import { daysFrom, bestHours, DAY_TYPE } from './days';
import { applyHypo, decodeSet } from './calibrate';
import { tzOffsetH } from './wallpaper';

const EL_NOM = ['дерево', 'огонь', 'земля', 'металл', 'вода'];
const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };
/** Без кухни: имена божеств в кавычках («Друг» — …) убираем, первая буква — заглавная. */
const clean = (s: string) => { const t = s.replace(/«[^»]*»\s*—\s*/g, '').trim(); return t[0].toUpperCase() + t.slice(1); };

export interface PushMsg { title: string; body: string; url: string; }

/** q — параметры карты (d, t, p, g[, u]) как в ссылке сайта; z — пояс человека (день и часы — по нему). */
export function pushMessage(q: Record<string, string>, z: string, now = new Date()): PushMsg | null {
  const d = q.d ?? '', [lat, lon, tz, ...name] = (q.p ?? '').split(','), t = q.t ?? '12:00';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !(t === '-' || /^\d{2}:\d{2}$/.test(t)) || !isFinite(+lat) || !isFinite(+lon) || !tz || !validTz(tz)) return null;
  const zz = validTz(z) ? z : tz;
  const c = computeChart({ date: d, time: t === '-' ? '12:00' : t, timeKnown: t !== '-', tz, lat: +lat, lon: +lon, male: q.g !== 'f', place: name.join(',') }, DEFAULT_VARIANT);
  const a = analyze(c);
  const u = decodeSet(q.u); if (u) applyHypo(a, u);
  const [Y, M, D] = new Intl.DateTimeFormat('en-CA', { timeZone: zz }).format(now).split('-').map(Number);
  const days = daysFrom(c, a, new Date(Y, M - 1, D), 8), day = days[0];
  const shift = zz === tz ? tzOffsetH(zz, now) - +lon / 15 : 0;
  const hh = bestHours(a, day, shift).slice(0, 2);
  const next = days.slice(1).filter((x) => x.type === 'peak').sort((x, y) => y.score - x.score)[0];
  const lines = [
    day.type === 'heavy' ? `Тема дня: ${clean(day.act)} — готовить, а не решать.` : `Что делать: ${clean(day.act)}.`,
    day.type === 'peak' ? '' : `${clean(DAY_TYPE[day.type].hint)}.`,
    day.heal ? `Чем выровнять: ${EL_NOM[day.med]}.` : '',
    hh.length ? `Лучшие часы: ${hh.join(', ')}.` : '',
    day.type !== 'peak' && next ? `Сильный день впереди: ${next.iso.slice(8).replace(/^0/, '')}.${next.iso.slice(5, 7)}.` : '',
  ].filter(Boolean);
  const qs = new URLSearchParams(); for (const k of ['d', 't', 'p', 'g', 'u']) if (q[k]) qs.set(k, q[k]);
  return { title: `Ваш день: ${DAY_TYPE[day.type].ru.toLowerCase()}, ${day.score} из 5`, body: lines.join(' '), url: `/bazi/?${qs}#s-days` };
}
