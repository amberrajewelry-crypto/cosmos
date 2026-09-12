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
         <span class="num">${fmt(v.value as number)}${v.unit ? `<small>${v.unit}</small>` : ''}</span>
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
  <article class="card tag-${v.tag}" aria-label="${v.label}"><div class="card-core">
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
  </div></article>`;
}

// Карточки не появляются статично: тяжёлый fade-up по мере входа в вьюпорт (IntersectionObserver, не scroll).
const seen = new WeakSet<Element>();
const io = typeof IntersectionObserver === 'undefined' ? null
  : new IntersectionObserver((entries) => {
      entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), i * 70); io!.unobserve(e.target); } });
    }, { threshold: 0.15 });

export interface PanelGroup { title: string; note?: string; values: Value[]; }

// Панель = группы карточек с приборными заголовками; пустая группа показывает своё примечание.
export function renderPanel(container: HTMLElement, groups: PanelGroup[] | Value[]): void {
  const gs: PanelGroup[] = Array.isArray(groups) && groups.length && 'values' in (groups[0] as PanelGroup)
    ? (groups as PanelGroup[]) : [{ title: '', values: groups as Value[] }];
  container.innerHTML = gs.map((g) => {
    const head = g.title ? `<h3 class="ph"><span>${g.title}</span><i></i></h3>` : '';
    const body = g.values.length ? g.values.map(card).join('') : (g.note ? `<p class="ph-note">${g.note}</p>` : '');
    return head + body;
  }).join('');
  container.querySelectorAll('.card').forEach((el, i) => {
    if (!io) { el.classList.add('in'); return; }
    if (seen.has(el)) return; seen.add(el);
    io.observe(el);
    // Уже видимые при первом рендере — ступенчато, без ожидания скролла.
    if (i < 4) setTimeout(() => el.classList.add('in'), 120 + i * 110);
  });
}
