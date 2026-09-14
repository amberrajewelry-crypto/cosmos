import type { Value } from '../types';
import { ask } from '../live/ask';
import { sendFeedback } from '../live/feedback';

// §7.7 интервьюер: не чаще раза за сессию, только после двух вопросов, легко отмахнуться.
let asked = 0, interviewed = false;

// Оверлей «Спросить» (§2.2). Открывается от карточки; в контекст уходят ВСЕ видимые значения
// (не только эта карточка) — вопрос может быть о связи параметров. Координаты не передаются (§3.7).
export function openAsk(overlay: HTMLElement, focus: Value | undefined, all: Value[], prefill = ''): void {
  const title = focus ? focus.label : 'Космос внутри тебя';
  overlay.innerHTML = `
    <div class="ask-box">
      <button class="ask-close" aria-label="Закрыть">✕</button>
      <h2>${title}</h2>
      <p class="ask-hint">Отвечает нейросеть, но числа она может брать только из того, что уже на экране. Выдуманные цифры машина вырезает.</p>
      <form class="ask-form">
        <input class="ask-input" type="text" autocomplete="off"
          placeholder="${focus ? 'Спросить об этом параметре…' : 'Спросить о своём космосе…'}" aria-label="Вопрос" />
        <button class="ask-send" type="submit">Спросить</button>
      </form>
      <div class="ask-answer" aria-live="polite"></div>
    </div>`;
  overlay.hidden = false;

  const input = overlay.querySelector('.ask-input') as HTMLInputElement;
  const answer = overlay.querySelector('.ask-answer') as HTMLElement;
  if (prefill) input.value = prefill + (focus ? `: ${focus.label}` : '');
  input.focus();

  const close = () => { overlay.hidden = true; };
  (overlay.querySelector('.ask-close') as HTMLButtonElement).addEventListener('click', close);

  (overlay.querySelector('.ask-form') as HTMLFormElement).addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    answer.textContent = 'Думаю…';
    const r = await ask(q, all);
    answer.className = 'ask-answer' + (r.ok ? '' : r.disabled ? ' ask-off' : ' ask-blocked');
    answer.textContent = r.text;
    if (r.ok) { asked++; sendFeedback({ kind: 'question', text: q, id: focus?.id }); } // §7.5: вопрос = дыра в интерфейсе
    if (asked >= 2 && !interviewed) {
      interviewed = true;
      const box = document.createElement('form'); box.className = 'ask-interview';
      box.innerHTML = `<label>Кстати — было что-то, что осталось непонятным? Я передам разработчику.</label><input type="text" maxlength="500" placeholder="одной фразой" /><button type="submit">передать</button><button type="button" class="ask-skip">не сейчас</button>`;
      answer.after(box);
      box.addEventListener('submit', (ev) => { ev.preventDefault(); const t = (box.querySelector('input') as HTMLInputElement).value.trim(); if (t) sendFeedback({ kind: 'note', text: t }); box.replaceWith(Object.assign(document.createElement('p'), { className: 'ask-off', textContent: t ? 'Передал. Спасибо.' : '' })); });
      box.querySelector('.ask-skip')!.addEventListener('click', () => box.remove());
    }
  });
}
