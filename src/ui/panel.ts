import type { Value } from '../types';

// Единица контента — карточка параметра (§2.5). Фактура кодирует тег (§4.4), НЕ цвет (§3.10).
function fmt(n: number): string {
  // разряды пробелами: 28500000 → «28 500 000»
  return n.toLocaleString('ru-RU');
}

function card(v: Value): string {
  const hasNum = v.value != null;
  // Число (если есть) + тег в шапке; чисто категориальный факт — тег уходит к заголовку.
  const head = hasNum
    ? `<div class="card-head">
         <span class="num">${fmt(v.value as number)}${v.unit ? ' ' + v.unit : ''}</span>
         <span class="tag">[${v.tag}]</span>
       </div>`
    : '';
  // text: либо самостоятельный факт (созвездие), либо примечание-направление к числу (нейтрино).
  const note = v.text ? `<p class="statement">${v.text}</p>` : (hasNum ? '' : `<p class="statement">[—]</p>`);
  const tagLine = hasNum ? '' : `<span class="tag tag-inline">[${v.tag}]</span>`;
  const src = !hasNum && !v.text ? 'источник недоступен' : v.source;
  return `
  <article class="card tag-${v.tag}" aria-label="${v.label}">
    ${head}
    ${note}
    <h2 class="label">${v.label} ${tagLine}</h2>
    <p class="explain">${v.explain}</p>
    <div class="src">${src}</div>
  </article>`;
}

export function renderPanel(container: HTMLElement, values: Value[]): void {
  container.innerHTML = values.map(card).join('');
}
