// Микрофон → одна фраза (Web Speech API). Отдельно от talk.ts: кнопке нужен только этот файл,
// разбор карты (~150 КБ) грузится лишь когда человек реально заговорил. Звук распознаёт браузер (Google/Apple).
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
  start: () => void; abort: () => void;
};
const Rec = (): (new () => Recognition) | undefined => {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
};
export const canListen = (): boolean => typeof window !== 'undefined' && !!Rec();

export interface Heard { text: string; error?: string; }

/** Слушать одну фразу. error: 'not-allowed' — нет доступа к микрофону, 'no-speech' — тишина. */
export function listen(): { done: Promise<Heard>; stop: () => void } {
  const r = new (Rec()!)();
  r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 1;
  let text = '', error: string | undefined;
  const done = new Promise<Heard>((resolve) => {
    r.onresult = (e) => { text = e.results[0]?.[0]?.transcript ?? ''; };
    r.onerror = (e) => { error = e.error; };
    r.onend = () => resolve({ text: text.trim(), error });
  });
  try { r.start(); } catch { error = 'start'; r.onend?.(); }
  return { done, stop: () => r.abort() };
}
