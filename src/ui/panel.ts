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
  // разряды пробелами: 28500000 → «28 500 000»; дроби — 1 знак (углы), мелкие — 2, целые — без хвоста.
  const a = Math.abs(n);
  const digits = Number.isInteger(n) ? 0 : a >= 10 ? 1 : 2;
  return n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits });
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
    <h3 class="label">${v.label} ${tagLine}</h3>
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

export interface PanelGroup { title: string; note?: string; values: Value[]; visual?: string; }

// Горизонт (§4 «каждый слой визуален»): полоса неба по азимуту, тела на своей высоте.
// Под горизонтом — призрачно. Масштаб по высоте линейный и подписан (§4.10).
export function horizonSVG(bodies: Array<{ name: string; glyph: string; alt: number; az: number }>): string {
  const W = 340, H = 118, HZ = 82;
  const y = (alt: number) => HZ - (alt / 90) * 66;
  const marks = ['С', 'В', 'Ю', 'З'].map((c, i) => `<text x="${(i * 90 / 360) * W + 2}" y="${H - 4}" font-size="9" fill="#c9a85c" font-family="Geist Mono,monospace" opacity=".7">${c}</text>`).join('');
  const dots = bodies.map((b) => {
    const x = (b.az / 360) * W, yy = y(Math.max(-30, b.alt)), up = b.alt > 0;
    return `<g opacity="${up ? 1 : .32}"><line x1="${x.toFixed(1)}" y1="${HZ}" x2="${x.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#c9a85c" stroke-width=".5" opacity=".5"/>
      <text x="${x.toFixed(1)}" y="${(yy + 5).toFixed(1)}" text-anchor="middle" font-size="${b.name === 'Солнце' ? 18 : 15}" fill="${b.name === 'Солнце' ? '#c9a85c' : '#ece6d3'}" font-family="Geist,sans-serif">${b.glyph}\uFE0E</text></g>`;
  }).join('');
  return `<svg class="horizon" viewBox="0 0 ${W} ${H}" role="img" aria-label="Небо над горизонтом сейчас">
    <rect x="0" y="0" width="${W}" height="${HZ}" fill="url(#skyg)"/>
    <defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1340" stop-opacity=".0"/><stop offset="1" stop-color="#c9a85c" stop-opacity=".10"/></linearGradient></defs>
    <line x1="0" y1="${HZ}" x2="${W}" y2="${HZ}" stroke="#c9a85c" stroke-width=".8" opacity=".8"/>
    ${[0, 90, 180, 270].map((a) => `<line x1="${(a / 360) * W}" y1="${HZ}" x2="${(a / 360) * W}" y2="${HZ + 5}" stroke="#c9a85c" stroke-width=".6" opacity=".6"/>`).join('')}
    <text x="${W - 2}" y="${y(90) + 8}" text-anchor="end" font-size="8" fill="#ece6d3" opacity=".45" font-family="Geist Mono,monospace">90° зенит</text>
    ${marks}${dots}
  </svg>`;
}

// Панель = группы карточек с приборными заголовками; пустая группа показывает своё примечание.
export function renderPanel(container: HTMLElement, groups: PanelGroup[] | Value[]): void {
  const gs: PanelGroup[] = Array.isArray(groups) && groups.length && 'values' in (groups[0] as PanelGroup)
    ? (groups as PanelGroup[]) : [{ title: '', values: groups as Value[] }];
  container.innerHTML = gs.map((g) => {
    const head = g.title ? `<h2 class="ph"><span>${g.title}</span><i></i></h2>` : '';
    const body = g.values.length ? g.values.map(card).join('') : (g.note ? `<p class="ph-note">${g.note}</p>` : '');
    const vis = g.visual && g.values.length ? `<div class="card in vis"><div class="card-core">${g.visual}</div></div>` : '';
    return `<section class="pg">${head}<div class="rail">${vis}${body}</div></section>`;
  }).join('');
  container.querySelectorAll('.card').forEach((el, i) => {
    if (!io) { el.classList.add('in'); return; }
    if (seen.has(el)) return; seen.add(el);
    io.observe(el);
    // Уже видимые при первом рендере — ступенчато, без ожидания скролла.
    if (i < 4) setTimeout(() => el.classList.add('in'), 120 + i * 110);
  });
}
