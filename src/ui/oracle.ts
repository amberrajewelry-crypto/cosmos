// Голос лица (§2.4): после каждого расчёта фигура сама говорит вывод — одной строкой, слева от лица.
// Числа НЕ сочиняются: каждая реплика собирается из уже посчитанных Value/аргументов, поэтому
// карантин чисел (live/ask.ts) здесь не нужен по построению — тест сверяет это правило.
import type { Value } from '../types';
import { levelName } from '../registry/content';

const SPEED_MS = 26;      // печать по букве
const HOLD_MS = 3400;     // пауза на прочтение (+ по длине строки)
const FADE_MS = 700;      // совпадает с transition в CSS

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const still = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

const num = (v: Value | undefined): number | null => (v && v.status === 'ok' ? v.value : null);
const by = (vals: Value[], id: string): Value | undefined => vals.find((v) => v.id === id);
const round = (x: number, d = 0): string => x.toFixed(d);

// Склонение числительного: 1 планета / 2 планеты / 5 планет.
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// --- Чистые сборщики реплик (тестируются отдельно) ---

/** Реплики после «что происходит с тобой сейчас»: небо в твоей точке. */
export function skyLines(vals: Value[]): string[] {
  const out: string[] = [];
  const sun = num(by(vals, 'sky.sun.altitude'));
  if (sun !== null) {
    out.push(sun > 0
      ? `Солнце в ${round(Math.abs(sun))}° над твоим горизонтом. Свет идёт к тебе напрямую.`
      : `Солнце на ${round(Math.abs(sun))}° ниже горизонта. Ты сейчас в тени Земли.`);
  }
  const constellation = by(vals, 'sky.sun.constellation')?.text;
  if (constellation) out.push(constellation);

  const moon = num(by(vals, 'sky.moon.altitude'));
  if (moon !== null && moon > 0) out.push(`Луна взошла — ${round(moon)}° над горизонтом.`);

  const planets = num(by(vals, 'sky.planets.above'));
  if (planets !== null) {
    out.push(planets === 0
      ? 'Ни одной видимой планеты над твоим горизонтом — сейчас там только Солнце и звёзды.'
      : `Над тобой ${round(planets)} ${plural(planets, 'планета', 'планеты', 'планет')} из пяти видимых глазом.`);
  }
  const shadow = num(by(vals, 'shadow.length'));
  if (shadow !== null && shadow > 0) out.push(`Твоя тень сейчас длиннее тебя в ${round(shadow, 1)} раза.`);

  const incl = num(by(vals, 'magnetic.inclination'));
  if (incl !== null) out.push(`Магнитные линии входят в тебя под ${round(Math.abs(incl))}° — поле держит тебя, пока ты читаешь.`);

  return out;
}

/** Реплика при смене уровня масштаба: уровень уже назван реестром. */
export function levelLine(level: number): string | null {
  const name = levelName(level);
  return name ? `Уровень: ${name}. То же вещество, другой масштаб.` : null;
}

/** Реплика по живому Kp — только когда магнитосферу действительно трясёт. */
export function kpLine(kp: number): string | null {
  if (kp < 4) return null;
  return `Kp ${round(kp, 1)} — магнитосферу сегодня качает. Это над тобой прямо сейчас.`;
}

/** Реплики после карты рождения: что небо делало в твой день. */
export function natalLines(realConstellation: string, asc?: number): string[] {
  const out = [realConstellation].filter(Boolean);
  if (typeof asc === 'number') out.push(`На востоке в час твоего рождения поднимался ${round(asc, 1)}° эклиптики — твой асцендент.`);
  out.push('Это расчёт неба, а не приговор. Толкование — традиция, и помечено так.');
  return out;
}

// --- Голос: встроенный синтез речи браузера (Web Speech API). По умолчанию выключен:
// внезапная речь на сайте — худшее, что можно сделать с посетителем. Состояние живёт в браузере. ---

const VOICE_KEY = 'oracle-voice';
const canSpeak = (): boolean => typeof speechSynthesis !== 'undefined';
let voiceOn = false;
try { voiceOn = localStorage.getItem(VOICE_KEY) === '1'; } catch { /* приватный режим — просто молчим */ }

// Русский голос, если он есть в системе; иначе браузер возьмёт свой по locale.
function ruVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ru'));
}

function speak(line: string): void {
  if (!voiceOn || !canSpeak()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = 'ru-RU'; u.rate = 0.92; u.pitch = 0.85; u.volume = 0.9; // ровнее и ниже обычного — это голос фигуры, не навигатора
  const v = ruVoice(); if (v) u.voice = v;
  u.onboundary = () => { lastWord = performance.now(); };
  speechSynthesis.speak(u);
}

// --- Рот: уровень 0..1 для шейдера лица. Говорит, пока печатается реплика или звучит голос. ---
let typing = false, lastWord = 0;
const voiced = (): boolean => voiceOn && canSpeak() && speechSynthesis.speaking;
/** Открытие рта сейчас (t — секунды сцены). Слоговый ритм + толчок на каждом слове, если браузер их шлёт. */
export function mouth(t: number): number {
  if (!typing && !voiced()) return 0;
  const syll = Math.abs(Math.sin(t * 11) * Math.sin(t * 4.3 + 1));
  const word = Math.max(0, 1 - (performance.now() - lastWord) / 160);
  return Math.min(1, 0.25 + 0.6 * syll + 0.4 * word);
}

/** Включить голос без кнопки — лицо в разговоре отвечает вслух. */
export function enableVoice(): void {
  const btn = document.getElementById('oracleVoice') as HTMLButtonElement | null;
  if (btn) setVoice(true, btn); else voiceOn = true;
}

// Дождаться, пока голос договорит реплику (иначе следующая оборвёт её на полуслове).
async function spoken(): Promise<void> { while (voiced()) await wait(150); }

function setVoice(on: boolean, btn: HTMLButtonElement): void {
  voiceOn = on;
  try { localStorage.setItem(VOICE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  btn.textContent = on ? 'голос включён' : 'озвучить';
  btn.setAttribute('aria-pressed', String(on));
  if (!on && canSpeak()) speechSynthesis.cancel();
}

function voiceButton(stage: HTMLElement): void {
  if (!canSpeak() || document.getElementById('oracleVoice')) return;
  const btn = document.createElement('button');
  btn.id = 'oracleVoice'; btn.type = 'button';
  stage.appendChild(btn);
  setVoice(voiceOn, btn);
  btn.addEventListener('click', () => {
    setVoice(!voiceOn, btn);
    if (voiceOn) speak(document.getElementById('oracle')?.textContent || 'Я здесь.'); // включил — сразу слышно, что это работает
  });
}

// --- Сцена: очередь и печать ---

const queue: string[] = [];
let speaking = false;
let gen = 0; // поколение очереди: перебивка (sayOnly) обрывает печать текущей реплики

// Говорит только лицо: без сцены (страницы без фигуры) голоса нет.
function host(): HTMLElement | null {
  const stage = document.getElementById('stage');
  if (!stage) return null;
  let el = document.getElementById('oracle');
  if (!el) {
    el = document.createElement('p');
    el.id = 'oracle';
    el.setAttribute('aria-live', 'polite');
    stage.appendChild(el);
  }
  voiceButton(stage);
  return el;
}

// Лицо закрыто оверлеем или вкладка не видна — говорить некому: ждём, а не тратим реплику.
const hidden = (): boolean =>
  document.hidden || ['natal', 'ask', 'honesty'].some((id) => {
    const el = document.getElementById(id);
    return !!el && !el.hidden;
  });

async function type(el: HTMLElement, line: string, g: number): Promise<void> {
  if (still()) { el.textContent = line; return; }
  el.textContent = '';
  for (const ch of line) {
    if (g !== gen) return;
    el.textContent += ch; await wait(SPEED_MS);
  }
}

async function pump(): Promise<void> {
  if (speaking) return;
  speaking = true;
  const el = host();
  if (!el) { queue.length = 0; speaking = false; return; }
  while (queue.length) {
    while (hidden()) await wait(400);
    const line = queue.shift() as string, g = gen;
    el.classList.add('on');
    speak(line);
    typing = true; await type(el, line, g); typing = false;
    if (g !== gen) continue; // перебили — не держим паузу на устаревшей реплике
    if (voiced()) { await spoken(); await wait(600); } else await wait(HOLD_MS + line.length * 14);
    if (g !== gen) continue;
    el.classList.remove('on');
    await wait(FADE_MS);
  }
  el.textContent = '';
  speaking = false;
}

/** Дождаться, пока лицо договорит всё из очереди (разговор слушает только после этого — не себя). */
export async function idle(): Promise<void> { while (speaking || queue.length) await wait(200); }

/** Сказать вместо всего, что ещё не сказано: для частых событий (зум), где важна только последняя. */
export function sayOnly(...lines: Array<string | null | undefined>): void {
  queue.length = 0; gen++;
  if (canSpeak()) speechSynthesis.cancel();
  say(...lines);
}

/** Поставить реплики в очередь. Пустые строки отбрасываются. */
export function say(...lines: Array<string | null | undefined>): void {
  queue.push(...lines.filter((s): s is string => !!s && !!s.trim()));
  void pump();
}
