// Разговор с лицом: голос → распознавание браузера → ответ лица репликой и голосом.
// Два контура ответа: про карту и небо — из уже посчитанного (без сети, числа не выдумать),
// остальное — через ask() с тем же карантином чисел. Звук распознаёт браузер (Google/Apple) — это сказано у кнопки.
import type { Value } from '../types';
import { parseSpokenBirth, matchSpokenPlace, type SpokenBirth } from './voice-parse';
import { loadPlaces, type Place } from '../data/places';
import { localToUtc } from '../compute/localtime';
import { ascMc } from '../compute/angles';
import { reading, type Reading, type Block } from '../natal/interp';
import { ask } from '../live/ask';
import * as oracle from './oracle';

type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
const Rec = (): (new () => Recognition) | undefined => {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
};
export const canListen = (): boolean => typeof window !== 'undefined' && !!Rec();

/** Одна фраза с микрофона. Пустая строка — ничего не сказано / отказ в доступе. */
function listen(): Promise<string> {
  return new Promise((resolve) => {
    const R = Rec(); if (!R) { resolve(''); return; }
    const r = new R();
    r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 1;
    let heard = '';
    r.onresult = (e) => { heard = e.results[0]?.[0]?.transcript ?? ''; };
    r.onerror = () => { /* no-speech / not-allowed — вернём пусто */ };
    r.onend = () => resolve(heard.trim());
    r.start();
  });
}

const fold = (s: string): string => s.toLowerCase().replace(/ё/g, 'е');
const plainTitle = (b: Block): string => b.title.replace(/^\S+︎\s*/, '').replace(/\s*℞/, '');
const blockLines = (b: Block): string[] => [
  `${plainTitle(b)}. ${b.d?.who ?? ''} ${b.d?.path ?? ''}`.trim(), b.d?.advice ? `Совет: ${b.d.advice}` : '',
];

const PLANETS: Array<[RegExp, string]> = [
  [/солнц/, 'Солнце'], [/лун/, 'Луна'], [/меркур/, 'Меркурий'], [/венер/, 'Венера'], [/марс/, 'Марс'],
  [/юпитер/, 'Юпитер'], [/сатурн/, 'Сатурн'], [/уран/, 'Уран'], [/нептун/, 'Нептун'], [/плутон/, 'Плутон'],
];
const NEED_CHART = 'Сначала скажи, когда и где ты родился. Например: пятнадцатое марта девяностого, четырнадцать тридцать, Тбилиси.';

/** Локальный ответ из разбора карты и неба. null — вопрос не про это, идём в ask(). Чистая функция. */
export function answerLocal(text: string, r: Reading | null, sky: string[]): string[] | null {
  const q = fold(text);
  const msg = (prefix: string): string[] => (r ? r.message.filter((l) => l.startsWith(prefix)) : []);
  if (/^(привет|здравствуй|добрый)/.test(q)) return [r ? 'Я здесь. Спрашивай про свою карту — или о чём угодно.' : 'Я здесь. Скажи дату, время и город рождения — я прочту твою карту.'];
  if (/(надо мной|над головой|небо сейчас|сейчас на небе|что на небе)/.test(q)) return sky.length ? sky : ['Разреши геолокацию кнопкой ниже — и я скажу, что сейчас над тобой.'];
  const chartQ = /(асцендент|восход|дверь|судьб|предназнач|узл|душ|хозя|аспект|послани|карт|кто я|совет|что мне делать|стихи|фаз|достоинств|знак)/.test(q)
    || PLANETS.some(([re]) => re.test(q));
  if (!chartQ) return null;
  if (!r) return [NEED_CHART];
  if (/фаз/.test(q)) return msg('Фаза Луны');
  if (/(асцендент|восход|дверь)/.test(q)) return msg(r.noTime ? 'Дверь в мир' : 'Асцендент');
  if (/(судьб|предназнач|узл|душ)/.test(q)) return msg('Узлы');
  if (/хозя/.test(q)) { const b = r.extras.find((e) => e.title.startsWith('Хозяин')); return b ? blockLines(b).filter(Boolean) : ['Хозяин карты виден только со временем рождения.']; }
  if (/аспект/.test(q)) return r.aspects[0] ? blockLines(r.aspects[0]).filter(Boolean) : msg('Планеты не связаны');
  if (/(стихи)/.test(q)) return r.balance.text;
  if (/(достоинств)/.test(q)) return msg('Сильны').concat(msg('Слабы'));
  if (/(совет|что мне делать)/.test(q)) return msg('Наставление');
  for (const [re, name] of PLANETS) {
    if (!re.test(q)) continue;
    const b = [...r.blocks, ...r.outer].find((x) => plainTitle(x).startsWith(name));
    if (b) return blockLines(b).filter(Boolean);
  }
  return r.message.slice(0, 5);
}

interface BirthApi { fill: (s: { date?: string; time?: string; place?: Place }) => void; }

export function initTalk(stage: HTMLElement, bf: BirthApi, values: () => Value[]): void {
  if (!canListen() || document.getElementById('talk')) return;
  const btn = document.createElement('button');
  btn.id = 'talk'; btn.type = 'button'; btn.textContent = 'говорить с лицом';
  btn.title = 'Речь распознаёт браузер (Google или Apple). Карта и координаты остаются у тебя.';
  stage.appendChild(btn);

  let chart: Reading | null = null;
  let pending: SpokenBirth | null = null; // дата есть, ждём время
  const history: string[] = [];

  const build = async (s: SpokenBirth, note = ''): Promise<void> => {
    let place: Place | undefined, miss = '';
    if (s.place) {
      place = matchSpokenPlace(await loadPlaces(), s.place);
      if (!place) miss = `Не нашёл «${s.place}» в базе городов — считаю без места. Назови крупный город рядом, и я уточню.`;
    }
    bf.fill({ date: s.date, time: s.time, place });
    const when = localToUtc(s.date!, s.time ?? '12:00', place?.tz);
    const asc = s.time && place ? ascMc(place.lat, place.lon, when).asc : undefined;
    chart = reading(when, asc);
    oracle.sayOnly(note, miss, ...chart.message.slice(0, 3), 'Спрашивай: Луна, Асцендент, судьба, совет — или о чём угодно. Полная карта — кнопкой ниже.');
  };

  const handle = async (text: string): Promise<void> => {
    const q = fold(text);
    if (/^(стоп|хватит|замолчи|тихо)/.test(q)) { oracle.sayOnly('Молчу.'); return; }
    if (pending) {
      const t = parseSpokenBirth(text);
      const s = { ...pending, time: t.time, place: pending.place ?? t.place };
      pending = null;
      await build(s, !t.time && !/не знаю|нет/.test(q) ? 'Время не расслышал — считаю без него, дома не будет.' : ''); return;
    }
    const s = parseSpokenBirth(text);
    if (s.date) {
      if (!s.time) { pending = s; oracle.sayOnly('Во сколько ты родился? Если не знаешь — скажи «не знаю».'); return; }
      await build(s); return;
    }
    const local = answerLocal(text, chart, oracle.skyLines(values()));
    if (local) { oracle.sayOnly(...local); return; }
    oracle.sayOnly('Думаю…');
    const extra = [chart ? `РАЗБОР КАРТЫ СОБЕСЕДНИКА:\n${chart.message.join('\n')}` : '', history.length ? `РАЗГОВОР:\n${history.join('\n')}` : '']
      .filter(Boolean).join('\n\n');
    const res = await ask(text, values(), extra);
    oracle.sayOnly(res.text);
    history.push(`Вопрос: ${text}`, `Ответ: ${res.text}`); history.splice(0, Math.max(0, history.length - 6));
  };

  btn.addEventListener('click', async () => {
    if (btn.classList.contains('on')) return;
    oracle.enableVoice();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); // не слушать собственный голос
    btn.classList.add('on'); btn.textContent = 'слушаю…';
    document.documentElement.classList.add('talk-listening');
    const text = await listen();
    btn.classList.remove('on'); btn.textContent = 'говорить с лицом';
    document.documentElement.classList.remove('talk-listening');
    if (!text) { oracle.sayOnly('Не расслышал. Нажми и скажи ещё раз.'); return; }
    await handle(text);
  });
}
