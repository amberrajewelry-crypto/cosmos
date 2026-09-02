import type { Value } from '../types';

// Единица контента — карточка параметра (§2.5). Фактура кодирует тег (§4.4), НЕ цвет (§3.10).
function fmt(n: number): string {
  // разряды пробелами: 28500000 → «28 500 000»
  return n.toLocaleString('ru-RU');
}

function card(v: Value): string {
  // Категориальный факт (созвездие/направление): показываем text вместо числа.
  const head = v.text
    ? `<p class="statement">${v.text}</p>`
    : `<div class="card-head">
         <span class="num">${v.value == null ? '[—]' : fmt(v.value)}${v.unit ? ' ' + v.unit : ''}</span>
         <span class="tag">[${v.tag}]</span>
       </div>`;
  const src = v.value == null && !v.text ? 'источник недоступен' : v.source;
  const tagLine = v.text ? `<span class="tag tag-inline">[${v.tag}]</span>` : '';
  return `
  <article class="card tag-${v.tag}" aria-label="${v.label}">
    ${head}
    <h2 class="label">${v.label} ${tagLine}</h2>
    <p class="explain">${v.explain}</p>
    <div class="src">${src}</div>
  </article>`;
}

export function renderPanel(container: HTMLElement, values: Value[]): void {
  container.innerHTML = values.map(card).join('');
}
