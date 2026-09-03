import type { Value } from '../types';
import { ask } from '../live/ask';

// Оверлей «Спросить» (§2.2). Открывается от карточки; в контекст уходят ВСЕ видимые значения
// (не только эта карточка) — вопрос может быть о связи параметров. Координаты не передаются (§3.7).
export function openAsk(overlay: HTMLElement, focus: Value | undefined, all: Value[]): void {
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
  });
}
