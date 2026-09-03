import type { Value } from '../types';

// «Спросить» (§2.2, §3.3): LLM отвечает СЛОВАМИ, но числа брать может ТОЛЬКО из того,
// что мы ему дали. Модель склонна выдумывать правдоподобные цифры — для проекта о честности
// это яд. Поэтому машина двухконтурная:
//   1) промпт с жёстким запретом изобретать числа;
//   2) пост-фильтр FAIL-CLOSED: если число нельзя уверенно распарсить и сверить — ответ на карантин.
// Ложное срабатывание (лишний карантин) допустимо; протечка выдуманного числа — нет.

// Тривиальными считаем только 0 и 1: любой «счётчик» вроде «3 градуса» неотличим от выдуманного
// измерения, поэтому пропускать его нельзя (урок adversarial-ревью).
// ponytail: набор минимальный; расширять только по данным, не «на всякий случай».
const TRIVIAL = new Set([0, 1]);

const GROUP_SEP = /[   ]/g; // NBSP + узкие пробелы = разделители разрядов

const MINUS = /[−–—]/g; // типографский минус/тире U+2212/2013/2014 → ASCII, иначе знак теряется

// «380 000» должно читаться одним числом, а не [380, 0]. Склеиваем пробел-разряды тысяч.
function joinThousands(s: string): string {
  return s.replace(MINUS, '-').replace(GROUP_SEP, ' ').replace(/(\d) (?=\d{3}(?:\D|$))/g, '$1');
}

// Конструкции, чью истинную величину парсер не восстанавливает уверенно (степени, дроби, отношения,
// время) → принудительный карантин. Научная нотация (e-форма) парсится ниже и сюда не входит.
const UNPARSEABLE = /[²³¹⁰-⁹]|\d\s*\^|\d\s*[/:]\s*\d/;
export function hasUnparseableQuantity(s: string): boolean {
  return UNPARSEABLE.test(s);
}

export interface NumTok { value: number; text: string; }

// Числовые токены со ИСХОДНЫМ текстом (точность важна для сверки) + научная нотация «6.5e10».
export function extractNumbers(s: string): NumTok[] {
  const joined = joinThousands(s);
  const out: NumTok[] = [];
  for (const m of joined.matchAll(/-?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/g)) {
    const value = Number(m[0].replace(',', '.'));
    if (Number.isFinite(value)) out.push({ value, text: m[0] });
  }
  return out;
}

// Сколько знаков после запятой показано в токене — задаёт допуск округления.
function decimalsOf(text: string): number {
  const frac = text.replace(',', '.').split('.')[1];
  return frac ? frac.replace(/[eE].*$/, '').length : 0;
}

// Токен разрешён, только если он равен какому-то входному числу, ПРАВИЛЬНО округлённому до своей
// показанной точности. Знак учитывается (−47 ≠ 47). Допуск = половина последнего разряда токена:
// целое «45» ← значение 45.23 (|Δ|≤0.5); «385000» ↛ 380000 (|Δ|=5000 ≫ 0.5) → карантин.
function allowed(n: NumTok, whitelist: number[]): boolean {
  if (TRIVIAL.has(n.value)) return true;
  const tol = 0.5 * Math.pow(10, -decimalsOf(n.text));
  return whitelist.some((w) => Math.abs(n.value - w) <= tol);
}

// Возвращает изобличающие числа (пусто = ответ чист). Непарсимая конструкция → сразу карантин.
const QUARANTINE_SENTINEL = Number.POSITIVE_INFINITY;
export function inventedNumbers(answer: string, context: string, values: Value[]): number[] {
  if (hasUnparseableQuantity(answer)) return [QUARANTINE_SENTINEL];
  const whitelist = [
    ...extractNumbers(context).map((t) => t.value),
    ...values.map((v) => v.value).filter((v): v is number => v != null),
    new Date().getFullYear(), // текущий год — известный истинный факт, не выдумка
  ];
  return extractNumbers(answer).filter((n) => !allowed(n, whitelist)).map((n) => n.value);
}

// Координаты не должны попасть в промпт даже при небрежном вызове (§3.7) — гвардим кодом, не комментом.
const COORD = /широт|долгот|latitude|longitude|координат/i;

// Контекст = только то, что уже на экране (числа + пояснения). Строки-координаты отбрасываем.
export function buildContext(values: Value[]): string {
  return values
    .filter((v) => !COORD.test(v.label) && !COORD.test(v.id) && !COORD.test(v.text ?? ''))
    .map((v) => {
      const num = v.value != null ? `${v.value}${v.unit ? ' ' + v.unit : ''} [${v.tag}]` : (v.text ?? '');
      return `— ${v.label}: ${num}. ${v.explain}`.trim();
    })
    .join('\n');
}

const SYSTEM = [
  'Ты — часть проекта COSMOS о ЧЕСТНОЙ физике. Отвечай по-русски, коротко, спокойно.',
  'ЖЕЛЕЗНОЕ ПРАВИЛО: не придумывай числа. Любую цифру бери ТОЛЬКО из списка фактов ниже.',
  'Если для ответа нужна цифра, которой в фактах нет, — так и скажи: «точного числа у меня нет».',
  'Говори о настоящем, сидерическом положении звёзд честно; не выдумывай предсказаний судьбы и характера.',
].join(' ');

export interface AskResult {
  ok: boolean;
  text: string;
  quarantined?: number[]; // числа, которые пришлось убрать как непроверенные
  disabled?: boolean;     // движок недоступен (нет кредитов/логина) — честно сообщаем
}

// Puter SDK грузим лениво и только когда пользователь реально спросил (§3.7 — до этого никаких внешних запросов).
let puterLoading: Promise<any> | null = null;
function loadPuter(): Promise<any> {
  const w = window as any;
  if (w.puter) return Promise.resolve(w.puter);
  if (puterLoading) return puterLoading;
  puterLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => (w.puter ? resolve(w.puter) : reject(new Error('puter not ready')));
    s.onerror = () => reject(new Error('puter load failed'));
    document.head.appendChild(s);
  });
  return puterLoading;
}

export async function ask(question: string, values: Value[]): Promise<AskResult> {
  const context = buildContext(values);
  const prompt = `${SYSTEM}\n\nФАКТЫ НА ЭКРАНЕ:\n${context}\n\nВОПРОС: ${question}`;
  let raw: string;
  try {
    const puter = await loadPuter();
    const resp = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
    raw = typeof resp === 'string' ? resp : (resp?.message?.content ?? resp?.text ?? '');
  } catch {
    // Нет кредитов / не залогинен / SDK недоступен — движок просто выключен, это не ошибка честности.
    return { ok: false, disabled: true, text: 'Ответы пока выключены — движок появится, когда подключим.' };
  }
  if (!raw || raw === '[object Object]') {
    // Модель вернула структуру, которую мы не смогли достать текстом — не выдаём мусор за ответ.
    return { ok: false, disabled: true, text: 'Ответ пришёл в непонятном виде — попробуй ещё раз.' };
  }
  const invented = inventedNumbers(raw, context, values);
  if (invented.length) {
    // Ответ содержит непроверенное число — не показываем его как факт.
    return {
      ok: false,
      quarantined: invented,
      text: 'Ответ содержал число, которого нет в проверенных данных, поэтому он скрыт. Числам без проверки здесь не место.',
    };
  }
  return { ok: true, text: raw.trim() };
}
