import type { Value } from '../types';

// §7.11 «число неверно» с первого дня. Без бэкенда (§3.7): отчёт собирается в mailto,
// координаты в него не попадают — только id, значение, источник и время расчёта.
const FEEDBACK_EMAIL = 'amberrajewelry@gmail.com';
export function wrongNumberMailto(v: Value): string {
  const body = [
    `Параметр: ${v.id} (${v.label})`,
    `Показано: ${v.value ?? '—'} ${v.unit} ${v.text ?? ''}`.trim(),
    `Тег: [${v.tag}] · верификация: ${v.verification}`,
    `Источник: ${v.source} · рассчитано: ${new Date(v.computedAt).toISOString()}`,
    '', 'Что показывает эталон и какой (ссылка):', '',
  ].join('\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('COSMOS: число неверно — ' + v.id)}&body=${encodeURIComponent(body)}`;
}

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
  // §3.9: у живых значений — возраст данных, видно, что «N минут назад».
  const isLive = /NOAA|SWPC/.test(v.source);
  const ageMin = Math.max(0, Math.round((Date.now() - v.computedAt) / 60000));
  const age = isLive && hasNum ? ` · обновлено ${ageMin} мин назад` : '';
  const src = (!hasNum && !v.text ? 'источник недоступен' : v.source) + age;
  return `
  <article class="card tag-${v.tag}" aria-label="${v.label}">
    ${head}
    ${note}
    <h2 class="label">${v.label} ${tagLine}</h2>
    <p class="explain">${v.explain}</p>
    <div class="src">${src}</div>
    <div class="card-actions">
      <button class="ask-more" data-ask="${v.id}">спросить дальше →</button>
      ${v.verifyUrl ? `<a class="ask-more" href="${v.verifyUrl}" target="_blank" rel="noopener">где проверить ↗</a>` : ''}
      <a class="ask-more wrong" href="${wrongNumberMailto(v)}">число неверно</a>
    </div>
  </article>`;
}

export function renderPanel(container: HTMLElement, values: Value[]): void {
  container.innerHTML = values.map(card).join('');
}
