import type { Value } from '../types';

// «Спросить» (§2.2, §3.3): LLM отвечает СЛОВАМИ, но числа брать может ТОЛЬКО из того,
// что мы ему дали. Модель склонна выдумывать правдоподобные цифры — для проекта о честности
// это яд. Поэтому машина двухконтурная:
//   1) промпт с жёстким запретом изобретать числа;
//   2) пост-фильтр: любое число в ответе, которого не было во входе, → ответ на карантин.
// Второй контур — не «на всякий случай», а гарантия: даже если модель нарушит промпт,
// пользователь не увидит выдуманную цифру как факт.

// Тривиальные числа, которые не считаем «выдуманными фактами»: годы, малые счётчики, проценты-рамка.
function isTrivial(n: number): boolean {
  if (Number.isInteger(n) && n >= 0 && n <= 12) return true;   // счётчики, месяцы, «два тысячелетия»→2
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return true; // годы
  return n === 100 || n === 0 || n === 1;                       // рамочные проценты/доли
}

// Все числовые токены строки: «45,2°», «380 000», «6.5e10» → [45.2, 380, 0, 6.5, 10].
// Пробел-разделитель разрядов рвём одинаково во ВХОДЕ и в ОТВЕТЕ — сравнение остаётся согласованным.
export function extractNumbers(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(/-?\d+(?:[.,]\d+)?/g)) {
    const n = Number(m[0].replace(',', '.'));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

// Ответное число «разрешено», если оно в пределах 2% от какого-то входного (модель округляет),
// либо тривиально. Иначе — изобретено.
function allowed(n: number, whitelist: number[]): boolean {
  if (isTrivial(n)) return true;
  return whitelist.some((w) => Math.abs(n - w) <= Math.max(Math.abs(w), 1) * 0.02);
}

export function inventedNumbers(answer: string, context: string, values: Value[]): number[] {
  const whitelist = [
    ...extractNumbers(context),
    ...values.map((v) => v.value).filter((v): v is number => v != null),
  ];
  return extractNumbers(answer).filter((n) => !allowed(n, whitelist));
}

// Контекст = только то, что уже на экране (числа + пояснения). Координаты сюда НЕ попадают (§3.7):
// шлём подписи, значения и объяснения, но не широту/долготу.
export function buildContext(values: Value[]): string {
  return values
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
  'Не давай астрологических предсказаний. Объясняй физику того, что человек видит на экране.',
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
    raw = typeof resp === 'string' ? resp : (resp?.message?.content ?? resp?.text ?? String(resp));
  } catch {
    // Нет кредитов / не залогинен / SDK недоступен — движок просто выключен, это не ошибка честности.
    return { ok: false, disabled: true, text: 'Ответы пока выключены — движок появится, когда подключим.' };
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
