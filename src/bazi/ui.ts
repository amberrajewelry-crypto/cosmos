import { confidence } from './confidence';
import { chartHash, answer, myAnswer, mySummary, globalSummary, myDays, sendRecog, recogSummary } from './journal';
import { reveal, wireMotion } from './motion';
import './bazi.css';
import { loadPlaces, findPlaces, placeLabel, placeDetail, type Place } from '../data/places';
import { canListen, listen } from '../ui/listen';
import { parseSpokenBirth, matchSpokenPlace } from '../ui/voice-parse';
import { ask } from '../live/ask';
import { track, sendFeedback } from '../live/feedback';
import {
  STEMS, BRANCHES, EL, EL_RGB, EL_COLOR, GODS, godOf, hiddenOf, stageOf, STAGES, nayinOf, TERMS, SEASON_STATE, type El,
} from './core';
import {
  computeChart, analyze, allVariants, DEFAULT_VARIANT, POS_RU, POS_SENSE, yearIdx,
  type BirthInput, type Chart, type Analysis, type Variant, type Pos,
} from './calc';
import { mountFx, elIcon } from './fx';
import { DM_TEXT, EL_NEED, godProfile, luckReading, chartSummary } from './interp';
import { describe, describeNote } from './describe';
import { rasklad, raskladNote, bookBasis } from './rasklad';
import { natureNote, strengthNote, axisNote, climateNote, comboNotes, bondNotes, godNatureNotes, luckDetail, portrait, type Note } from './reading';
import { spheres } from './spheres';
import { compat } from './compat';
import { periodVerdict } from './brain';
import { calibrate, applyHypo, rankHours, encodeSet, SPHERE_RU, type LifeEvent, type Hypo, type Sphere } from './calibrate';
import { daysIcs } from './ics';
import { yearForecast, decade, baziYear, pillarZh, toneRu } from './forecast';
import { daysFrom, showThenClose, bestHours, DAY_TYPE, type DayInfo, dayInfo } from './days';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const AMOUNT = (x: number) => (x >= 0.3 ? 'много' : x >= 0.15 ? 'в меру' : x >= 0.06 ? 'мало' : 'почти нет');
// Посетителю — без иероглифов и ссылок на трактаты: убираем скобки/кавычки с китайским и одиночные знаки.
const plain = (s: string) => s.replace(/\s*[(«「][^()«»「」]*[\u4e00-\u9fff][^()«»「」]*[)»」]/g, '').replace(/\s*[\u4e00-\u9fff]+/g, '').replace(/\s*\((?:ДТС|ЦПЦЦ|ЮХ|СМ|ШФ|ЦЛ|МЛЮЯ|ЦТБЦ|KB)[^)]*\)/g, '').replace(/(?<![А-Яа-яё])[Пп]о (?:ДТС|ЦПЦЦ|ЮХ|СМ|ШФ|ЦЛ)(?![А-Яа-яё])/g, (m) => m[0] + 'о классике').replace(/\s*\(\s*[,;·]?\s*\)/g, '').replace(/\s*\([^()]*\d+\s?%[^()]*\)/g, '').replace(/\s*\([+−-]?\d+\)/g, '').replace(/,?\s*[—-]?\s*\d+\s?%/g, '').replace(/\(\s*—\s*/g, '(').replace(/\s*—\s*(?=[.,;:)]|$)/g, '').replace(/\s+([.,;:])/g, '$1').replace(/:([.;])/g, '$1').replace(/(?<!\.)\.\.(?!\.)/g, '.');
// Классические имена богов звучат пугающе — на странице мягкие («Давление», «Соперник», «Бунтарь»).
const RANG: Record<string, string> = { 'ий': 'Бунтарь', 'его': 'Бунтаря', 'ему': 'Бунтарю', 'им': 'Бунтарём' };
const UBI: Record<string, string> = { 'о': 'Давление', 'а': 'Давления', 'у': 'Давлению', 'ом': 'Давлением' };
const soften = (s: string) => s.replace(/Семь убийств/g, 'Давление').replace(/Грабител[а-я]* богатства/g, 'Соперник')
  .replace(/Ранящ(ий|его|ему|им)( чиновника)?/g, (_, e: string) => RANG[e]).replace(/Убийств(ом|о|а|у)/g, (_, e: string) => UBI[e]);
const esc = (s: string) => plain(soften(s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const rgb = (e: number) => EL_RGB[e];
const pol = (yang: boolean) => (yang ? 'ян' : 'инь');
const lbl = (p: Place) => (p.cc ? placeLabel(p) : p.ru);
const ANIMAL = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
const IMGS = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const animalSrc = (b: number) => IMGS[`./img/${ANIMAL[b]}.webp`];

// ——— Фон: поток ци ———
const qi = (() => {
  const cv = $<HTMLCanvasElement>('qi'), ctx = cv.getContext('2d')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, weights = [0.2, 0.2, 0.2, 0.2, 0.2], t = 0;
  type P = { x: number; y: number; e: number; s: number; life: number };
  let ps: P[] = [];
  const pickEl = () => { let r = Math.random(), i = 0; for (; i < 4; i++) { r -= weights[i]; if (r < 0) break; } return i; };
  const spawn = (): P => ({ x: Math.random() * W, y: Math.random() * H, e: pickEl(), s: 0.4 + Math.random() * 1.4, life: 200 + Math.random() * 400 });
  const resize = () => { const d = Math.min(devicePixelRatio, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = '#07061a'; ctx.fillRect(0, 0, W, H); };
  resize(); addEventListener('resize', resize);
  const N = innerWidth < 700 ? 140 : 280;
  ps = Array.from({ length: N }, spawn);
  const frame = () => {
    t += 0.0016;
    ctx.fillStyle = 'rgba(7,6,26,0.12)'; ctx.fillRect(0, 0, W, H);
    for (const p of ps) {
      const a = Math.sin(p.x * 0.0021 + t * 3) * 1.6 + Math.cos(p.y * 0.0027 - t * 2) * 1.6 + p.e * 1.2566;
      p.x += Math.cos(a) * p.s; p.y += Math.sin(a) * p.s - 0.15; p.life--;
      if (p.life < 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) Object.assign(p, spawn());
      ctx.fillStyle = `rgba(${EL_RGB[p.e]},${0.12 + 0.22 * Math.sin(p.life * 0.02) ** 2})`;
      ctx.fillRect(p.x, p.y, 1.4, 1.4);
    }
    if (!reduce) requestAnimationFrame(frame);
  };
  frame();
  return { tint(w: number[]) { const s = w.reduce((a, b) => a + b, 0); weights = w.map((x) => x / s); ps.forEach((p) => (p.e = pickEl())); } };
})();

// ——— Флагманская мандала: 12 животных по кругу, 5 живых стихий внутри ———
(() => {
  const o = document.getElementById('orbit');
  if (!o) return;
  const ring = ANIMAL.map((_, b) => `<span style="--a:${b * 30}deg"><img src="${animalSrc(b)}" alt="" /></span>`).join('');
  const FX5 = [3, 4, 7, 8, 0]; // Огонь (вверху), Земля, Металл, Вода, Дерево — по кругу порождения
  const inner = FX5.map((stem, i) => { const a = -90 + i * 72, e = STEMS[stem].el; return `<div class="o-el" style="--x:${Math.cos((a * Math.PI) / 180) * 24}%;--y:${Math.sin((a * Math.PI) / 180) * 24}%;--rgb:${rgb(e)}"><canvas class="fxc" data-stem="${stem}"></canvas><b>${EL[e]}</b></div>`; }).join('');
  o.innerHTML = `<div class="o-ring">${ring}</div><svg class="o-pent" viewBox="-50 -50 100 100"><circle r="26" /><path d="${[0, 2, 4, 1, 3, 0].map((i, k) => `${k ? 'L' : 'M'}${(Math.cos(((-90 + i * 72) * Math.PI) / 180) * 26).toFixed(2)},${(Math.sin(((-90 + i * 72) * Math.PI) / 180) * 26).toFixed(2)}`).join('')}" /></svg>${inner}<div class="o-core"><span>8</span>знаков</div>`;
  requestAnimationFrame(() => o.querySelectorAll<HTMLCanvasElement>('canvas.fxc').forEach((cv) => mountFx(cv, +cv.dataset.stem!)));
})();

// ——— Форма ———
let places: Place[] = [], chosen: Place | undefined;
const fd = $<HTMLInputElement>('fd'), ft = $<HTMLInputElement>('ft'), fnt = $<HTMLInputElement>('fnt'), fp = $<HTMLInputElement>('fp'), fpl = $<HTMLUListElement>('fpl'), msg = $('fmsg');
fp.addEventListener('focus', async () => { if (!places.length) places = await loadPlaces(); });
let seq = 0;
fp.addEventListener('input', async () => {
  chosen = undefined;
  const my = ++seq;
  const hits = await findPlaces(fp.value, 10);
  if (my !== seq) return; // пришёл ответ на старый ввод
  fpl.innerHTML = hits.map((p, i) => `<li data-i="${i}"><b>${esc(p.ru || p.name)}${p.alias ? ` <i>(${esc(p.alias)})</i>` : ''}</b><small>${esc(placeDetail(p))}</small></li>`).join('');
  fpl.hidden = !hits.length;
  fpl.onclick = (e) => { const li = (e.target as HTMLElement).closest('li'); if (!li) return; chosen = hits[+li.dataset.i!]; fp.value = lbl(chosen); fpl.hidden = true; };
});
fp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !fpl.hidden) { e.preventDefault(); (fpl.firstElementChild as HTMLElement)?.click(); } });
document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.place')) fpl.hidden = true; });
const TRACKED = new Set(['pdf', 'share', 'ics', 'addlist', 'saveme']);
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, b = t.closest<HTMLElement>('button[id]'), sm = t.closest('summary');
  if (b && TRACKED.has(b.id)) track(`bazi:${b.id}`);
  if (sm) track(`bazi:open:${sm.closest('section')?.querySelector('h2')?.textContent?.slice(0, 24) ?? '?'}`);
});
document.addEventListener('submit', (e) => { const id = (e.target as HTMLElement).id; if (id === 'askf' || id === 'cf') track(`bazi:${id}`); });
fnt.addEventListener('change', () => (ft.disabled = fnt.checked));

const voiceBtn = $<HTMLButtonElement>('voice');
if (canListen() && new URLSearchParams(location.search).has('voice')) {
  voiceBtn.hidden = false;
  voiceBtn.onclick = async () => {
    voiceBtn.textContent = 'Слушаю…'; msg.textContent = 'Скажите, например: «двенадцатое мая девяностого года в половине третьего, Москва»';
    if (!places.length) places = await loadPlaces();
    const h = await listen().done;
    voiceBtn.textContent = 'Сказать голосом';
    if (h.error || !h.text) { msg.textContent = 'Не расслышал — попробуйте ещё раз или заполните поля.'; return; }
    const s = parseSpokenBirth(h.text);
    if (s.date) fd.value = s.date;
    if (s.time) { ft.value = s.time; fnt.checked = false; ft.disabled = false; }
    if (s.place) { const p = matchSpokenPlace(places, s.place); if (p) { chosen = p; fp.value = placeLabel(p); } }
    msg.textContent = `Услышал: «${h.text}»`;
    if (fd.value && chosen) $<HTMLFormElement>('f').requestSubmit();
  };
}

$<HTMLFormElement>('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!places.length) places = await loadPlaces();
  if (!chosen) chosen = (await findPlaces(fp.value, 1))[0];
  if (!fd.value) { msg.textContent = 'Укажите дату рождения.'; return; }
  if (!chosen) { msg.textContent = 'Не нашёл такой город — начните вводить и выберите из списка.'; return; }
  fp.value = lbl(chosen);
  const male = (document.querySelector('input[name=g]:checked') as HTMLInputElement).value === 'm';
  const input: BirthInput = { date: fd.value, time: fnt.checked ? '12:00' : ft.value || '12:00', timeKnown: !fnt.checked, tz: chosen.tz, lat: chosen.lat, lon: chosen.lon, male, place: lbl(chosen) };
  const q = new URLSearchParams({ d: input.date, t: input.timeKnown ? input.time : '-', p: `${chosen.lat},${chosen.lon},${chosen.tz},${lbl(chosen)}`, g: male ? 'm' : 'f' });
  history.replaceState(null, '', `?${q}`);
  lastQuery = q.toString();
  msg.textContent = '';
  build(input);
});

// ——— Построение ———
let current: { input: BirthInput; variant: Variant } | null = null;
let lastQuery = '';
const ME_KEY = 'bazi-me';
// Несколько карт в этом браузере: [{ q, label }]. Хранилище может быть недоступно (приватный режим) — тогда просто пусто.
const LIST_KEY = 'bazi-list';
type Saved = { q: string; label: string };
const loadSaved = (): Saved[] => { try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch { return []; } };
const storeSaved = (xs: Saved[]) => { try { localStorage.setItem(LIST_KEY, JSON.stringify(xs)); } catch { /* storage off */ } };
function renderSaved() {
  const xs = loadSaved(), cur = new URLSearchParams(location.search).toString();
  document.querySelectorAll<HTMLElement>('.saved').forEach((el) => {
    el.hidden = !xs.length;
    el.innerHTML = xs.length ? `<span class="eyebrow">Мои карты</span>${xs.map((x, i) => `<span class="sv${x.q === cur ? ' cur' : ''}"><a href="?${esc(x.q)}">${esc(x.label)}</a><button type="button" data-del="${i}" aria-label="Удалить ${esc(x.label)}">×</button></span>`).join('')}` : '';
  });
  document.querySelectorAll<HTMLButtonElement>('.saved [data-del]').forEach((b) => (b.onclick = () => { const xs2 = loadSaved(); xs2.splice(+b.dataset.del!, 1); storeSaved(xs2); renderSaved(); }));
}
/** Разделы после «Кто вы» — свёрнутые плитки: заголовок + одна строка, содержимое по нажатию. */
const openSecs = new Set<string>();
let onToggle: ((e: Event) => void) | null = null;
function fold(out: HTMLElement) {
  out.querySelectorAll<HTMLElement>('section.block').forEach((s) => {
    const head = s.querySelector<HTMLElement>(':scope > .bhead');
    if (!head || s.id === 's-fb') return;
    const h2 = head.querySelector('h2')!, lead = head.querySelector(':scope > p:not(.acc)'), acc = head.querySelector(':scope > p.acc');
    const key = s.id || h2.textContent!;
    const d = document.createElement('details');
    d.className = 'fold'; d.dataset.key = key; d.open = openSecs.has(key);
    d.innerHTML = `<summary><span class="f-t"><h2>${h2.innerHTML}</h2>${lead ? `<small>${lead.innerHTML}</small>` : ''}</span><i class="f-ch" aria-hidden="true"></i></summary>`;
    const body = document.createElement('div'); body.className = 'f-body';
    head.remove(); if (acc) body.append(acc);
    while (s.firstChild) body.append(s.firstChild);
    d.append(body); s.append(d); s.classList.add('folded');
  });
}
/** Анимации стихий — только видимым холстам: в закрытом разделе ширина 0, холст вышел бы мыльным. */
function mountVisible(root: HTMLElement) {
  root.querySelectorAll<HTMLCanvasElement>('canvas.fxc:not([data-m])').forEach((cv) => {
    if (cv.closest('details:not([open])')) return;
    cv.dataset.m = '1'; mountFx(cv, +cv.dataset.stem!);
  });
}
function build(input: BirthInput, variant: Variant = DEFAULT_VARIANT) {
  current = { input, variant };
  const variants = allVariants(input);
  const charts = variants.map((v) => { const c = computeChart(input, v); return { v, c, a: analyze(c) }; });
  const c = computeChart(input, variant), a = analyze(c);
  const past = loadPast(input);
  if (past.apply) applyHypo(a, past.apply);
  qi.tint(a.pct.map((x) => 0.05 + x));
  const out = $('out');
  out.hidden = false;
  // 08.10 «убери лишнее»: в основном потоке — кто вы, ответы на 7 вопросов, год, дни, пара. Остальное — в одной свёрнутой группе.
  const example = new URLSearchParams(location.search).has('ex');
  out.innerHTML = [example ? '<section class="block ex-note"><div class="card pane"><p><b>Это пример</b> — разбор Стива Джобса (24.02.1955, 19:15, Сан-Франциско). Так будет выглядеть и ваш.</p><button class="go" id="ex-own" type="button">Построить свою карту</button></div></section>' : '', secWho(c, a), '<p class="fold-hint">Откройте нужный раздел</p>', secRasklad(c, a), secForecast(c, a), secDays(c, a), secCompat(), example ? '' : pushCta(),
    `<section class="block deep"><details class="more"><summary><h2>Для тех, кому интересно глубже</h2><p>Устройство карты, такты, сферы жизни, сверка с прошлым, вопросы к карте.</p></summary>`,
    secSpheres(c, a), secLuck(c, a), secPast(c, past), secAsk(), secPillars(c, a), secElements(c, a, charts), secSeason(c), secRazbor(c, a),
    '</details></section>', secFeedback(), secHonest()].join('');
  track('bazi:build');
  requestAnimationFrame(() => {
    out.querySelectorAll<HTMLElement>('.pillar').forEach((el, i, all) => setTimeout(() => el.classList.add('on'), 200 + (all.length - 1 - i) * 380));
    fold(out);
    reveal(out); wireMotion();
    drawLinks(c, a);
    mountVisible(out);
    if (onToggle) out.removeEventListener('toggle', onToggle, true);
    out.addEventListener('toggle', (onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.dataset.key) d.open ? openSecs.add(d.dataset.key) : openSecs.delete(d.dataset.key);
      if (!d.open) return;
      mountVisible(d);
      if (d.querySelector('#links')) drawLinks(c, a);
    }), true);
    wire(c, a, charts);
    wireDays(c, a);
    wirePast(c, a, input);
    wireRecog(input);
    void wirePush();
    const own = document.getElementById('ex-own');
    if (own) own.onclick = () => { fd.value = ''; ft.value = ''; fp.value = ''; chosen = undefined; history.replaceState(null, '', location.pathname); lastQuery = ''; out.hidden = true; $('f').scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => fd.focus(), 400); };
    if (input.timeKnown) wireJudge(c, a);
  });
  if (!sessionStorage.getItem('bazi-scrolled')) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stemTile(stem: number) {
  return `<div class="glyph fx" style="--rgb:${rgb(STEMS[stem].el)}"><canvas class="fxc" data-stem="${stem}" aria-label="${STEMS[stem].ru}: ${STEMS[stem].image}"></canvas></div>`;
}
function branchTile(b: number) {
  return `<div class="glyph ani" style="--rgb:${rgb(BRANCHES[b].el)}"><img src="${animalSrc(b)}" alt="${BRANCHES[b].animal}" loading="lazy" decoding="async" /></div>`;
}
/** Основной поток — без кухни расчёта: имена божеств в кавычках, ветви, такты, пустота, союзы, трактаты. */
const lay = (s: string) => s.replace(/«[^»]*»\s*—\s*/g, '').split(/(?<=[.;])\s+/).filter((x) => !/ветв|пуст|союз|такт|трактат/i.test(x)).join(' ').replace(/[.;,]\s*$/, '');
const animalOf = (idx: number) => `<span style="color:${EL_COLOR[BRANCHES[idx % 12].el]}">${BRANCHES[idx % 12].animal}</span>`;
/** Тон периода — тот же, что в прогнозе и раскладе (periodVerdict мозга), текст — luckReading. */
const luckR = (c: Chart, a: Analysis, idx: number) => { const t = periodVerdict(a.brain, idx, c).tone; return { ...luckReading(a, idx, t), t4: t }; };
const thumb = (b: number, size = 44) => `<img class="thumb" src="${animalSrc(b)}" alt="${BRANCHES[b].animal}" width="${size}" height="${size}" loading="lazy" />`;

/** «Расклад по 7 вопросам» (rasklad.ts): ответы из расчёта + на чём держится каждый. */
function secRasklad(c: Chart, a: Analysis) {
  const seen = new Set(portrait(c, a)); // то, что уже сказано в «Кто вы», не повторяем
  const items = rasklad(c, a).map((x, i) => `<div class="card pane rk"><p class="rk-q"><span>${i + 1}</span>${esc(x.q)}</p>${x.a.filter((l) => !seen.has(l)).map((l) => `<p>${esc(l)}</p>`).join('')}</div>`).join('');
  return `<section class="block" id="s-rasklad"><div class="bhead"><div><h2>Расклад по 7 вопросам</h2></div>
    <p>То, что разбирают на консультации, — посчитано по вашей карте.</p></div>
    <div class="rk-grid">${items}</div></section>`;
}

function secWho(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], day = c.pillars.find((p) => p.pos === 'day')!, br = BRANCHES[day.branch], t = DM_TEXT[a.dm];
  const yr = c.pillars.find((p) => p.pos === 'year')!;
  const nowY = new Date().getFullYear(), cur = c.luck.find((l, i) => nowY >= l.year && (i === c.luck.length - 1 || nowY < c.luck[i + 1].year));
  const lr = cur ? luckR(c, a, cur.idx) : null, tone = lr ? lr.tone : 'mixed', t4 = lr ? lr.t4 : 'mixed';
  return `<section class="block who" style="--rgb:${rgb(d.el)}">
    <div class="who-fx"><canvas class="fxc" data-stem="${a.dm}"></canvas></div>
    <div class="who-txt"><p class="eyebrow">Кто вы</p>
      <h2>${t.title}</h2>
      <p class="who-sub">Ваша стихия — ${EL[d.el].toLowerCase()} · вам полезны: ${a.consensus.map((e) => EL[e].toLowerCase()).join(', ').replace(/, (?=[^,]*$)/, ' и ')}</p>
      ${portrait(c, a).map((l) => `<p>${esc(l)}</p>`).join('')}
      ${a.brain.alt ? `<p>Сила у вас на грани, поэтому в разные периоды полезно разное: обычно — ${EL[a.brain.yong].toLowerCase()}, а в годы, когда ${a.brain.alt.lean === 'strong' ? 'приходит поддержка' : 'растёт нагрузка'}, — ${EL[a.brain.alt.yong].toLowerCase()}. Прогноз и календарь дней это учитывают.</p>` : ''}
      <div class="who-row">
        <div><img src="${animalSrc(day.branch)}" alt="" /><span>Животное дня<b>${br.animal}</b></span></div>
        <div><img src="${animalSrc(yr.branch)}" alt="" /><span>Животное года<b>${BRANCHES[yr.branch].animal}</b></span></div>
        ${cur ? `<div class="lt ${tone}"><img src="${animalSrc(cur.idx % 12)}" alt="" /><span>Десятилетие сейчас<b>${cur.year}–${cur.year + 9} · ${t4 === 'good' ? 'благоприятно' : t4 === 'bad' ? 'нагрузка' : t4 === 'calm' ? 'спокойно' : 'смешанно'}</b></span></div>` : ''}
      </div></div></section>`;
}

function secPillars(c: Chart, a: Analysis) {
  const cols = c.pillars.map((p) => {
    const s = STEMS[p.stem], b = BRANCHES[p.branch], isDm = p.pos === 'day';
    const g = isDm ? '<b>Вы</b>' : `<b>${godOf(a.dm, p.stem).ru}</b>`;
    const hid = hiddenOf(p.branch).map((h) => {
      const hs = STEMS[h.stem];
      return `<span style="--rgb:${rgb(hs.el)}" title="${hs.ru} (${EL[hs.el]}) — ${godOf(a.dm, h.stem).ru}"><b class="hh">${elIcon(hs.el, EL_COLOR[hs.el], 18)}${hs.ru}</b><small>${godOf(a.dm, h.stem).short}</small><i style="width:${Math.round(h.w * 36)}px"></i></span>`;
    }).join('');
    const [ny] = nayinOf(p.idx);
    return `<article class="pillar${isDm ? ' dm' : ''}" style="--c1:${EL_COLOR[s.el]};--c2:${EL_COLOR[b.el]}">
      <div class="pl-pos">${POS_RU[p.pos]}</div><div class="pl-sense">${POS_SENSE[p.pos]}</div>
      <div class="god">${g}</div>
      ${stemTile(p.stem)}<div class="gl-name">${s.ru}</div><div class="gl-sub">${EL[s.el]} ${pol(s.yang)} · ${s.image}</div>
      <div class="sep"></div>
      ${branchTile(p.branch)}<div class="gl-name">${b.ru} · ${b.animal}</div><div class="gl-sub">${EL[b.el]} · ${b.hours}</div>
      <div class="hid">${hid}</div>
      <div class="pl-row"><em>Стадия ци</em>${STAGES[stageOf(a.dm, p.branch)]}</div>
      <div class="pl-row"><em>На Инь</em>${ny}</div>
    </article>`;
  }).join('');
  const L = c.local, pad = (n: number) => String(n).padStart(2, '0');
  return `<section class="block" id="s-pillars">
    <div class="bhead"><div><h2>Четыре столпа</h2></div>
    <p>Читается справа налево, как в китайской карте: год (корни) → месяц → день (вы) → час (плоды). Верхний знак — небесный ствол, нижний — земная ветвь со спрятанными стволами.</p></div>
    <div class="pillars-wrap"><div class="pillars" style="--n:${c.pillars.length}">${cols}</div><svg class="links" id="links"></svg></div>
    <p class="meta">${esc(c.input.place ?? '')} · ${c.input.date} ${c.input.timeKnown ? c.input.time : '(время неизвестно — без столпа часа)'} · по солнцу в месте рождения ${pad(L.h)}:${pad(L.min)}</p>
  </section>`;
}

function drawLinks(c: Chart, a: Analysis, anim = true) {
  const svg = document.getElementById('links') as unknown as SVGSVGElement | null;
  if (!svg) return;
  svg.classList.toggle('noanim', !anim);
  const cols = [...document.querySelectorAll<HTMLElement>('.pillar')];
  const box = svg.getBoundingClientRect();
  const xs: Record<string, number> = {};
  c.pillars.forEach((p, i) => { const r = cols[i].getBoundingClientRect(); xs[p.pos] = r.left + r.width / 2 - box.left; });
  const span = (it: (typeof a.interactions)[number]) => { const v = [it.a, it.b, it.c].filter(Boolean).map((p) => xs[p as Pos]); return Math.max(...v) - Math.min(...v); };
  const I = [...a.interactions].sort((x, y) => span(x) - span(y));
  if (!I.length) { svg.outerHTML = '<p class="inter-empty">Между столпами нет столкновений и союзов — карта «тихая», её события приходят извне, через такты удачи.</p>'; return; }
  const gap = box.width < 500 ? 40 : 28; // narrow screens: room for a label between arcs
  const h = Math.max(110, Math.round((24 + (I.length - 1) * gap) * 0.75 + 30)); // lowest label + margin
  svg.setAttribute('height', String(h)); svg.style.height = h + 'px';
  svg.innerHTML = I.map((it, k) => {
    const pts = [it.a, it.b, it.c].filter(Boolean).map((p) => xs[p as Pos]).sort((x, y) => x - y);
    const x1 = pts[0], x2 = pts[pts.length - 1], depth = 24 + k * gap;
    const col = it.tone === 'harm' ? '#ef6a4c' : it.el != null ? EL_COLOR[it.el] : '#c9a85c';
    const d = `M${x1},4 C${x1},${depth} ${x2},${depth} ${x2},4`;
    const len = Math.round(Math.abs(x2 - x1) + depth * 2);
    const mid = pts.length === 3 ? `<circle cx="${pts[1]}" cy="${depth * 0.75}" r="3" fill="${col}"/>` : '';
    return `<g style="--len:${len};--dl:${1.6 + k * 0.25}s"><path d="${d}" stroke="${col}" ${it.tone === 'harm' ? 'stroke-dasharray="6 5"' : ''} style="--len:${len}"/>${mid}
      <text x="${Math.min(Math.max((x1 + x2) / 2, 80), box.width - 80)}" y="${depth * 0.75 + 14}" text-anchor="middle" fill="${col}">${esc(it.label)}</text></g>`;
  }).join('');
}

function wheel(a: Analysis) {
  const cx = 260, cy = 250, R = 170;
  const ang = [198, -90, -18, 54, 126].map((d) => (d * Math.PI) / 180);
  const P = ang.map((t) => [cx + R * Math.cos(t), cy + R * Math.sin(t)]);
  const live: { x: number; y: number; r: number; e: number }[] = [];
  let s = '<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="rgba(201,168,92,.8)"/></marker>';
  for (let e = 0; e < 5; e++) s += `<radialGradient id="g${e}"><stop offset="0" stop-color="${EL_COLOR[e]}" stop-opacity=".95"/><stop offset=".6" stop-color="${EL_COLOR[e]}" stop-opacity=".35"/><stop offset="1" stop-color="${EL_COLOR[e]}" stop-opacity="0"/></radialGradient>`;
  s += '</defs>';
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(201,168,92,.12)"/>`;
  for (let e = 0; e < 5; e++) {
    const n = (e + 1) % 5, t1 = ang[e] + 0.32, t2 = ang[n] - 0.32 + (n === 0 ? 2 * Math.PI : 0) * 0;
    const a1 = [cx + R * Math.cos(t1), cy + R * Math.sin(t1)], a2 = [cx + R * Math.cos(ang[n] - 0.32), cy + R * Math.sin(ang[n] - 0.32)];
    void t2;
    s += `<path class="flow" d="M${a1[0]},${a1[1]} A${R},${R} 0 0 1 ${a2[0]},${a2[1]}" fill="none" stroke="rgba(201,168,92,.7)" stroke-width="1.6" marker-end="url(#ar)"/>`;
    const c2 = (e + 2) % 5, p1 = P[e], p2 = P[c2];
    const k1 = 0.2, k2 = 0.8;
    s += `<line class="ctl" x1="${p1[0] + (p2[0] - p1[0]) * k1}" y1="${p1[1] + (p2[1] - p1[1]) * k1}" x2="${p1[0] + (p2[0] - p1[0]) * k2}" y2="${p1[1] + (p2[1] - p1[1]) * k2}" stroke="rgba(239,90,60,.35)" stroke-width="1.2"/>`;
  }
  for (let e = 0; e < 5; e++) {
    const [x, y] = P[e], r = 26 + a.pct[e] * 110;
    const fav = a.consensus.includes(e as El), bad = a.avoid.includes(e as El), me = a.dmEl === e;
    s += `<g><circle class="node" cx="${x}" cy="${y}" r="${r}" fill="url(#g${e})"/>`;
    if (fav) s += `<circle cx="${x}" cy="${y}" r="${r + 8}" fill="none" stroke="#9fe3b7" stroke-width="1.4" stroke-dasharray="3 5"/>`;
    if (me) s += `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="none" stroke="#e2c47c" stroke-width="2.2"/>`;
    live.push({ x, y, r: Math.max(24, r * 0.78), e });
    const ly = y + (y > cy ? r + 30 : -r - 28);
    s += `<text x="${x}" y="${ly}" text-anchor="middle" font-size="15" font-weight="600" fill="${EL_COLOR[e]}">${EL[e]}</text>`;
    const tags = [me ? 'вы' : '', fav ? 'полезна' : '', bad ? 'нагрузка' : ''].filter(Boolean).join(' · ');
    if (tags) s += `<text x="${x}" y="${ly + 17}" text-anchor="middle" font-size="12" fill="rgba(236,230,211,.6)">${tags}</text>`;
    s += '</g>';
  }
  const FX_OF = [0, 3, 4, 7, 8];
  const cvs = live.map((n) => `<canvas class="fxc wfx" data-stem="${FX_OF[n.e]}" style="left:${((n.x - n.r + 40) / 600) * 100}%;top:${((n.y - n.r + 30) / 560) * 100}%;width:${((n.r * 2) / 600) * 100}%"></canvas>`).join('');
  return `<div class="wheel-wrap"><svg class="wheel" viewBox="-40 -30 600 560" role="img" aria-label="Круг пяти стихий">${s}</svg>${cvs}</div>`;
}

function secElements(c: Chart, a: Analysis, charts: { v: Variant; a: Analysis }[]) {
  const bars = [0, 1, 2, 3, 4].map((e) => `<div class="bar" style="--rgb:${rgb(e)}"><div>${EL[e]}<small>${SEASON_STATE[seasonStateOf(e, a.monthEl)]}</small></div><div class="track"><div class="fill" data-w="${Math.round(a.pct[e] * 100)}%"></div></div><div class="v">${AMOUNT(a.pct[e])}</div></div>`).join('');
  const rs = charts.map((x) => x.a.ratio), lo = Math.min(...rs), hi = Math.max(...rs);
  const chip = (e: El) => `<span class="chip" style="--rgb:${rgb(e)}">${elIcon(e, EL_COLOR[e], 18)}${EL[e]}</span>`;
  const methods = a.useful.map((u) => `<div><b>${u.method}:</b> ${u.why}. Полезно — ${u.fav.map((e) => EL[e]).join(', ')}.</div>`).join('');
  void c;
  return `<section class="block"><div class="bhead"><div><h2>Пять стихий</h2></div>
    <p>Сколько каждой стихии в вашей карте. Стрелки по кругу показывают, какая стихия питает следующую, пунктир внутри — какая сдерживает.</p></div>
    <div class="grid2"><div class="card pane">${wheel(a)}</div>
    <div class="card pane"><div class="bars">${bars}</div>
      <div class="gauge"><h3>Ваша сила: ${a.strength}</h3>
        <div class="scale"><div class="rng" style="left:${lo * 100}%;width:${Math.max(1, (hi - lo) * 100)}%"></div><div class="mk" style="left:${a.ratio * 100}%"></div></div>
        <div class="lbl"><span>слабый</span><span>баланс</span><span>сильный</span></div>
        <p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">В сезон рождения ${STEMS[a.dm].ru} ${SEASON_STATE[a.season].toLowerCase()}.</p></div>
      <h3 style="margin-top:22px">Полезные стихии</h3><div class="chips">${a.consensus.map(chip).join('')}</div>
      ${a.avoid.length ? `<p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">Нагрузка: ${a.avoid.map((e) => EL[e]).join(', ')}</p>` : ''}
      ${((k) => `<p class="conf ${k.dispute ? 'low' : 'mid'}"><b>На чём держится вывод: ${k.dispute ? 'классика, есть спорное место' : 'классика, школы согласны'}.</b> ${esc(raskladNote(a))}${current && loadPast(current.input).apply ? ' Полезные стихии здесь подобраны по вашим прошлым годам — проверено на вашей жизни, но на небольшом числе событий.' : ' Уточнить под себя — блок «Сверка с вашей жизнью» ниже.'}</p>`)(bookBasis(a))}
      <div class="methods">${methods}</div>
    </div></div></section>`;
}
function seasonStateOf(e: number, m: number) { return e === m ? 0 : (m + 1) % 5 === e ? 1 : (e + 1) % 5 === m ? 2 : (e + 2) % 5 === m ? 3 : 4; }

function secSeason(c: Chart) {
  const cx = 230, cy = 230, R = 190;
  const pos = (lon: number, r: number) => { const t = ((lon - 315 - 90) * Math.PI) / 180 - 0; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
  let s = '';
  const seasons: [number, El][] = [[315, 0], [45, 1], [135, 3], [225, 4]];
  for (const [from, e] of seasons) {
    const [x1, y1] = pos(from, R), [x2, y2] = pos(from + 90, R);
    s += `<path d="M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}" fill="none" stroke="${EL_COLOR[e]}" stroke-opacity=".55" stroke-width="10"/>`;
  }
  for (let k = 0; k < 24; k++) {
    const lon = 315 + k * 15, jie = k % 2 === 0;
    const [x1, y1] = pos(lon, R - (jie ? 22 : 12)), [x2, y2] = pos(lon, R + 6);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(236,230,211,${jie ? 0.6 : 0.25})" stroke-width="${jie ? 1.4 : 1}"/>`;
    if (jie) { const [tx, ty] = pos(lon + 15, R - 40); const b = (2 + k / 2) % 12; s += `<image href="${animalSrc(b)}" x="${tx - 19}" y="${ty - 19}" width="38" height="38"/>`; }
  }
  const [sx, sy] = pos(c.sunLon, R);
  s += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="rgba(226,196,124,.5)" stroke-dasharray="3 4"/>`;
  s += `<circle cx="${sx}" cy="${sy}" r="11" fill="#ffd66b" style="filter:drop-shadow(0 0 10px #ffb400)"/>`;
  const term = TERMS[c.termIdx].split(' · ');
  s += `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="30" fill="#ece6d3">${term[0]}</text>`;
  s += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="14" fill="rgba(236,230,211,.6)">${term[1]}</text>`;
  const L = c.local, pad = (n: number) => String(n).padStart(2, '0');
  return `<section class="block"><div class="bhead"><div><h2>Сезон рождения</h2></div>
    <p>Китайский год делится на 24 сезона по Солнцу, и месяц начинается не с 1-го числа, а со сменой сезона. Поэтому знаки карты могут отличаться от привычного календаря.</p></div>
    <div class="grid2"><div class="card pane"><svg class="ring" viewBox="0 0 460 460" role="img" aria-label="Кольцо 24 сезонов">${s}</svg></div>
    <div class="card pane"><div class="facts">
      <div><span>Сезон рождения</span><b>${TERMS[c.termIdx]}</b></div>
      <div><span>Время по солнцу в месте рождения</span><b>${pad(L.h)}:${pad(L.min)}</b></div>
      <div><span>Такты удачи начинаются</span><b>примерно в ${Math.max(1, Math.round(c.startAge))} ${Math.max(1, Math.round(c.startAge)) % 10 === 1 && Math.max(1, Math.round(c.startAge)) !== 11 ? 'год' : 'лет'}</b></div>
    </div></div></div></section>`;
}

function secLuck(c: Chart, a: Analysis) {
  const now = new Date(), nowY = now.getFullYear();
  const cur = c.luck.findIndex((l, i) => nowY >= l.year && (i === c.luck.length - 1 || nowY < c.luck[i + 1].year));
  const cards = c.luck.map((l, i) => {
    const r = luckR(c, a, l.idx), s = STEMS[l.idx % 10], b = BRANCHES[l.idx % 12];
    return `<button class="lk ${r.tone}${i === cur ? ' now sel' : ''}" data-i="${i}">${thumb(l.idx % 12, 64)}<span class="lk-el">${elIcon(s.el, EL_COLOR[s.el], 16)}<b style="color:${EL_COLOR[s.el]}">${s.ru}</b></span><small>${b.animal}</small><div class="age">${Math.floor(l.age)}–${Math.floor(l.age) + 9} лет</div><small>${l.year}–${l.year + 9}</small></button>`;
  }).join('');
  const yrs = Array.from({ length: 10 }, (_, k) => nowY - 1 + k).map((y) => {
    const i = yearIdx(y), r = luckR(c, a, i), s = STEMS[i % 10], b = BRANCHES[i % 12];
    return `<div class="yr ${r.tone}${y === nowY ? ' now' : ''}" title="${esc(r.text + ' ' + luckDetail(c, a, i).join(' '))}">${thumb(i % 12, 40)}<span class="yr-el">${elIcon(s.el, EL_COLOR[s.el], 13)}${EL[s.el]}</span>${y}<br>${b.animal}</div>`;
  }).join('');
  const sel = cur >= 0 ? cur : 0, rd = luckR(c, a, c.luck[sel].idx);
  return `<section class="block"><div class="bhead"><div><h2>Такты удачи</h2></div>
    <p>Каждые 10 лет меняется фон жизни — это такты удачи. Зелёная черта — приходит полезная стихия, красная — нагрузка. Нажмите на такт.</p></div>
    <div class="luck">${cards}</div>
    <div class="reading" id="lkr"><b>${c.luck[sel].year}–${c.luck[sel].year + 9}${sel === cur ? ' · сейчас' : ''}.</b> ${esc(rd.text)} ${esc(luckDetail(c, a, c.luck[sel].idx).join(' '))}</div>
    <h3 style="margin-top:26px">Годы</h3><div class="years">${yrs}</div></section>`;
}

const noteHtml = (n: Note) => `<div class="note ${n.tone ?? ''}"><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p></div>`;

const ucFirst = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const lcFirst = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
const hitsTxt = (h: string[]) => (h.length ? ' ' + esc(lay(ucFirst(h.join('; ')))) + '.' : '');

function secForecast(c: Chart, a: Analysis) {
  const Y = baziYear(), y = yearForecast(c, a, Y), dec = decade(c, a, Y);
  const dt = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const pill = animalOf;
  const cur = Math.max(0, y.months.findIndex((_, i) => (y.months[i + 1]?.start ?? y.end) > new Date()));
  const mHtml = y.months.map((m, i) => `<div class="fm ${m.tone}"><p class="fm-d">${dt(m.start)} — ${dt(new Date((y.months[i + 1]?.start ?? y.end).getTime() - 864e5))}</p>
    <b>${pill(m.idx)}</b><span class="fm-t">${toneRu(m.tone)}</span><p class="fm-w">${esc(lay(m.why))}${m.swing ? ` (${esc(m.swing)})` : ''}</p><p>${esc(lay(m.act))}</p>${m.hits.map((h) => `<p class="fm-h">${esc(lay(h))}</p>`).join('')}</div>`);
  const rest = mHtml.filter((_, i) => i < cur || i > cur + 2);
  const months = `<div class="fm-grid">${mHtml.slice(cur, cur + 3).join('')}</div>${rest.length ? `<details class="more-in"><summary>Все месяцы года</summary><div class="fm-grid">${rest.join('')}</div></details>` : ''}`;
  // Удары (hits) и подробности такта (luckDetail) частично совпадают — повтор убираем, предложения — с заглавной.
  const yHtml = dec.map((d) => {
    const det = d.detail.filter((x) => !d.hits.some((h) => x.toLowerCase().includes(h)));
    return `<li class="fy ${d.tone}"><b>${d.year}</b> <span>${pill(d.idx)}</span> <span class="fm-t">${toneRu(d.tone)}</span>: ${esc(lcFirst(d.why))}; ${esc(lay(d.text))}.
    <details><summary>Подробнее</summary><small>Чем заняться — ${esc(lay(d.act))}.${hitsTxt(d.hits)} ${esc(lay(det.join(' ')))}</small></details></li>`;
  });
  const years = `<ul class="list fy-list">${yHtml.slice(0, 3).join('')}</ul><details class="more-in"><summary>Остальные ${yHtml.length - 3} лет</summary><ul class="list fy-list">${yHtml.slice(3).join('')}</ul></details>`;
  return `<section class="block"><div class="bhead"><div><h2>Ваш год и десятилетие</h2></div><p>Год по китайскому календарю начинается около 4 февраля. Для каждого месяца и года — насколько он вам благоприятен и чем лучше заняться.</p></div>
    <div class="card pane"><h3>${Y} · ${pill(y.idx)} — ${toneRu(y.tone)}</h3><p>${esc(lay(y.text[0].toUpperCase() + y.text.slice(1)))}. Главное дело года: ${esc(lay(y.act))}.${hitsTxt(y.hits)}${y.luck ? ` Десятилетие с ${y.luck.from} года — ${toneRu(y.luck.tone)}: оно задаёт общий фон, год — погода внутри него.` : ''}</p>
      ${months}</div>
    <div class="card pane" style="margin-top:22px"><h3>Десять лет по годам</h3>${years}</div></section>`;
}

function secSpheres(c: Chart, a: Analysis) {
  const cards = spheres(c, a).map((x) => `<div class="card pane sph"><h3>${esc(x.title)}</h3><p class="lead">${esc(x.lead)}</p>
    <ul class="list">${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="todo"><b>Что делать.</b> ${esc(x.todo)}</p></div>`).join('');
  return `<section class="block"><div class="bhead"><div><h2>Ваша жизнь по сферам</h2></div><p>Характер, дело, деньги, любовь, здоровье и родные — простыми словами из вашей карты.</p></div>
    <div class="sph-grid">${cards}</div></section>`;
}

// ——— Утренняя карточка дня (Web Push: /api/push, рассылка tools/push_worker.ts в 8:00 по поясу человека) ———
const VAPID_PUBLIC = 'BAtafqYtBLaVo0Hdz37tmWAPbdl4KsKLTImwFW3nXXCJU9BEjwhEWNrUQ0bYFB_tASdD7CUImFgr-YnWukGH_1I';
function pushCta() {
  return `<section class="block push-cta"><div class="card pane"><p class="eyebrow">Каждое утро</p><h3>Ваш день — в 8:00 на телефон</h3>
    <p>Короткая подсказка: сильный день или нагрузка, что делать, лучшие часы. Чтобы считать её, данные рождения хранятся у нас; отключить — той же кнопкой.</p>
    <button class="go" data-push type="button">Получать мой день каждое утро</button><p class="dhint" data-pushmsg></p>
    <div class="acts"><button class="ghost" id="share" type="button">Поделиться разбором</button><button class="ghost" id="pdf" type="button">Сохранить в PDF</button></div></div></section>`;
}
function chartQuery(): string {
  const wq = new URLSearchParams(lastQuery || location.search.slice(1)), wp = new URLSearchParams();
  for (const k of ['d', 't', 'p', 'g']) { const v = wq.get(k); if (v) wp.set(k, v); }
  const ap = current && loadPast(current.input).apply; if (ap) wp.set('u', encodeSet(ap));
  return wp.toString();
}
const b64key = (s: string) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (ch) => ch.charCodeAt(0)); };
async function swReg(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/bazi-sw.js', { scope: '/bazi/' });
  for (let i = 0; i < 100 && !reg.active; i++) await new Promise((r) => setTimeout(r, 100));
  return reg;
}
async function wirePush() {
  const btns = [...document.querySelectorAll<HTMLButtonElement>('[data-push]')], msgs = [...document.querySelectorAll<HTMLElement>('[data-pushmsg]')];
  if (!btns.length) return;
  const say = (t: string) => msgs.forEach((m) => (m.textContent = t));
  const label = (on: boolean) => btns.forEach((b) => (b.textContent = on ? 'Отключить утренний день' : 'Получать мой день каждое утро'));
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (ios && !standalone) { btns.forEach((b) => (b.onclick = () => say('На iPhone уведомления работают из приложения: «Поделиться» → «На экран „Домой“», откройте сайт с иконки и нажмите эту кнопку там.'))); return; }
    document.querySelector('.push-cta')?.remove(); btns.forEach((b) => b.remove()); return;
  }
  let sub: PushSubscription | null = null;
  try { const r = await navigator.serviceWorker.getRegistration('/bazi/'); sub = r ? await r.pushManager.getSubscription() : null; } catch { /* нет доступа */ }
  label(!!sub && localStorage.getItem('bazi-push') === chartQuery());
  btns.forEach((b) => (b.onclick = async () => {
    btns.forEach((x) => (x.disabled = true));
    try {
      if (sub && localStorage.getItem('bazi-push') === chartQuery()) {
        await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ off: sub.endpoint }) });
        await sub.unsubscribe(); sub = null; localStorage.removeItem('bazi-push'); label(false); say('Отключено.'); track('bazi:push:off'); return;
      }
      if ((await Notification.requestPermission()) !== 'granted') { say('Уведомления запрещены в настройках браузера — разрешите их для сайта и нажмите снова.'); return; }
      const reg = await swReg();
      sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64key(VAPID_PUBLIC) });
      let z = ''; try { z = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* нет Intl */ }
      const r = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), q: chartQuery(), z: z || current?.input.tz }) });
      if (!r.ok) throw new Error(String(r.status));
      localStorage.setItem('bazi-push', chartQuery()); label(true); say('Готово: завтра в 8 утра придёт ваш день.'); track('bazi:push:on');
    } catch { say('Не получилось включить — попробуйте позже.'); }
    finally { btns.forEach((x) => (x.disabled = false)); }
  }));
}

function secRazbor(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], t = DM_TEXT[a.dm], gp = godProfile(a);
  const inter = a.interactions.map((i) => `<li class="${i.tone === 'harm' ? 'harm' : ''}"><b>${esc(i.label)}</b> — ${POS_RU[i.a]}${i.b ? ' и ' + POS_RU[i.b].toLowerCase() : ''}${i.c ? ' и ' + POS_RU[i.c].toLowerCase() : ''}: ${INTER_SENSE[i.kind]}</li>`).join('');
  const godsList = Object.entries(a.gods).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => `<li><b>${GODS[k].ru}</b> — ${GODS[k].sense}</li>`).join('');
  const combos = comboNotes(c, a), bonds = bondNotes(c, a);
  return `<section class="block"><details class="more"><summary><h2>Подробный разбор карты</h2><p>Из чего сложена карта и почему выводы такие — для тех, кому интересно глубже.</p></summary>
    <div class="razbor">
      <div class="card pane"><div class="dm-hero">${stemTile(a.dm)}<div><h3>${t.title}</h3><p><b>${d.ru}</b> — ${EL[d.el]} ${pol(d.yang)}. Сила: ${a.strength}.</p></div></div>
        ${noteHtml(describeNote(c, a))}${noteHtml(natureNote(a))}${noteHtml(strengthNote(c, a))}
        <div class="note"><h4>В образах</h4><p><b>Дар:</b> ${t.gift}. <b>Тень:</b> ${t.shadow}. <b>Путь:</b> ${t.way}</p></div></div>
      <div class="card pane"><h3>Ось и климат</h3><p class="conf mid judge" id="judge" hidden></p>${noteHtml(axisNote(c, a))}${noteHtml(climateNote(c, a))}
        <h4 class="sub">Полезный бог · ${esc(a.brain.frame.name)}</h4>${a.brain.steps.map((st) => noteHtml({ title: st.title, text: st.text })).join('')}
        <h4 class="sub">Что вас питает: главное — ${EL[a.brain.yong]}</h4>${a.consensus.map((e) => `<p>${EL_NEED[e]}</p>`).join('')}
        ${a.avoid.length ? `<p><b>Меньше:</b> ${a.avoid.map((e) => EL[e]).join(', ')} — в избытке эта стихия давит на карту.</p>` : ''}</div>
      <div class="card pane"><h3>10 божеств: ${gp.top.map((t) => t.replace(/\s*\d+%/, '')).join(' и ').toLowerCase()}</h3><p>${gp.text}</p><ul class="list">${godsList}</ul>
        ${godNatureNotes(a).map(noteHtml).join('')}
        ${combos.length ? `<h4 class="sub">Классические формулы в стволах</h4>${combos.map(noteHtml).join('')}` : ''}</div>
      <div class="card pane"><h3>Связи в карте</h3><ul class="list">${inter || '<li>Столкновений и союзов нет — карта спокойная.</li>'}</ul>
        ${bonds.map(noteHtml).join('')}</div>
    </div></details></section>`;
}

const INTER_SENSE: Record<string, string> = {
  clash: 'разрыв и движение: переезды, смена работы или отношений в сферах этих столпов',
  six: 'тайный союз и притяжение — поддержка, которая приходит через людей',
  harm: 'недопонимание и мелкие обиды между этими сферами',
  punish: 'испытание через ошибки и суд — урок, который повторяется, пока не усвоен',
  scombo: 'стволы тянутся друг к другу — союз целей, иногда размывающий собственную стихию',
  sclash: 'прямой конфликт намерений',
  trine: 'сильнейший союз — стихия становится главной темой жизни',
  half: 'неполный союз — стихия усиливается, ждёт третий знак в такте или году',
  dir: 'сезонный союз — вся сторона света в карте, стихия доминирует',
};

function dayCard(d: DayInfo, big = false, extra = '') {
  const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12];
  return `<div class="dcard ${d.type}${big ? ' big' : ''}">${thumb(d.idx % 12, big ? 64 : 44)}<div>
    <p class="eyebrow">${dLabel(d)} · ${dayRu(d)} · ${d.score} из 5</p>
    <h3><span style="color:${EL_COLOR[s.el]}">${b.animal}</span></h3>
    <p><b>${d.type === 'heavy' ? 'Тема дня' : 'Что делать'}:</b> ${esc(lay(d.act))}${d.type === 'heavy' ? ' — сегодня готовить и обдумывать, а не решать' : ''}.</p>
    ${d.type === 'peak' ? '' : `<p class="dhint">${DAY_TYPE[d.type].hint[0].toUpperCase() + DAY_TYPE[d.type].hint.slice(1)}.</p>`}
    ${((w) => w.length ? `<p class="dnote">Осторожно: ${w.map(esc).join('; ')}.</p>` : '')([...d.notes, ...(big ? d.warn : [])].map(lay).filter(Boolean))}
    ${big && d.good.length ? `<p class="dgood">Плюс дня: ${d.good.map(esc).join('; ')}.</p>` : ''}
    ${big && extra ? extra : ''}
  </div></div>`;
}

// Часы на руке = солнечное время + сдвиг. Если человек в том же поясе, что при рождении, — по долготе места рождения,
// иначе — по середине своего пояса (точность ±30 мин).
function clockShift(c: Chart): number {
  const off = -new Date().getTimezoneOffset() / 60;
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* нет Intl */ }
  return c.input.tz && tz === c.input.tz ? off - c.input.lon / 15 : 0;
}
const ACC_EL = ['Дерево', 'Огонь', 'Землю', 'Металл', 'Воду'];
/** «Сильный · 2 из 5» читается как противоречие: стихия дня полезна, но фон десятилетия/года тянет вниз — так и пишем. */
const dayRu = (d: DayInfo) => DAY_TYPE[d.type].ru;
const BG_RU = { good: 'благоприятное', bad: 'с нагрузкой', mixed: 'смешанное', calm: 'спокойное' } as const;
const BG_RU_Y = { good: 'благоприятный', bad: 'с нагрузкой', mixed: 'смешанный', calm: 'спокойный' } as const;
function bgRu(d: DayInfo): string {
  const b = d.bg, parts = [`${b.luck ? `десятилетие ${BG_RU[b.luck]}, ` : ''}год ${BG_RU_Y[b.year]}`];
  parts.push(b.adj > 0 ? 'фон приподнимает оценку дня' : b.adj < 0 ? 'фон снижает оценку дня' : 'на оценку дня не влияет');
  return parts.join(' — ') + (b.swung ? '. В это десятилетие ваша сила меняет баланс, поэтому полезные стихии на нём другие, чем по рождению.' : '.');
}
function dayMore(c: Chart, a: Analysis, d: DayInfo, days: DayInfo[]): string {
  const hh = bestHours(a, d, clockShift(c));
  const k = days.findIndex((x) => x.iso === d.iso), next = days[k + 1], week = days.slice(k + 1, k + 8);
  const top = week.reduce<DayInfo | null>((m, x) => (!m || x.score > m.score ? x : m), null);
  return `<div class="dmore">
    <p><b>${d.heal ? 'Чем выровнять день' : 'На что опереться'}:</b> ${EL[d.med]} — ${esc(d.why)}.</p>
    ${hh.length ? `<p><b>Лучшие часы:</b> ${hh.join(', ')} <span class="dhint">(примерно, по местному времени)</span>.</p>` : ''}
    <p class="dhint"><b>Фон:</b> ${bgRu(d)}</p>
    <h4>${d.heal ? 'Как добавить' : 'Как поддержать'} ${ACC_EL[d.med]}</h4>
    <ul class="list"><li>${esc(d.add.theory)}</li>
      <li>${esc(d.add.folk)}</li></ul>
    ${next ? `<p class="dhint">Завтра, ${dLabel(next)}: ${dayRu(next).toLowerCase()}, ${next.score} из 5.${top ? (top.score >= 3 ? ` Лучший день недели для важного — ${dLabel(top)} (${top.score} из 5).` : (d.score >= 3 ? ` Дальше на неделе сильных дней нет — важное лучше поставить на сегодня.` : ` Сильных дней на неделе нет — важное лучше перенести; самый ровный — ${dLabel(top)}.`)) : ''}</p>` : ''}
    <p class="dhint">Оценка из 5 — расчёт по стихиям и связям дня с вашей картой, не гарантия.</p>
  </div>`;
}

// ——— Мои дни: календарь по карте ———
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dLabel = (d: DayInfo, wd = true) => { const [y, m, dd] = d.iso.split('-').map(Number); const w = new Date(y, m - 1, dd).getDay(); return `${dd} ${MON[m - 1]}${wd ? ', ' + WD[w] : ''}`; };
const dayCell = (d: DayInfo, today: boolean) => { const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12], dd = +d.iso.slice(8);
  return `<button class="dc ${d.type}${today ? ' now' : ''}" data-iso="${d.iso}" title="${esc(DAY_TYPE[d.type].ru + ' · ' + d.god.short)}"><b>${dd}</b><span style="color:${EL_COLOR[s.el]}">${elIcon(s.el, EL_COLOR[s.el], 11)}</span><img src="${animalSrc(d.idx % 12)}" alt="${b.animal}" loading="lazy" /></button>`; };

function secDays(c: Chart, a: Analysis) {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = daysFrom(c, a, start, 120), today = days[0];
  // Лучшие — от 3 из 5; самые высокие оценки без запрета на крупное, потом по дате (раньше брались первые 5 подряд, в т.ч. «3 из 5, крупное не начинать»).
  const best = days.slice(0, 45).filter((d) => d.type === 'peak' && d.score >= 3 && !d.notes.some((n) => n.includes('не начинать') || n.includes('не для решений')))
    .sort((x, y) => y.score - x.score || x.iso.localeCompare(y.iso)).slice(0, 5).sort((x, y) => x.iso.localeCompare(y.iso));
  const pairs = showThenClose(days).slice(0, 5);
  const off = (start.getDay() + 6) % 7, grid = days.slice(0, 56);
  const cells = Array.from({ length: off }, () => '<i></i>').join('') + grid.map((d, k) => dayCell(d, k === 0)).join('');
  const fav = a.consensus.map((e) => EL[e]).join(', ').replace(/, (?=[^,]*$)/, ' и '), bad = a.avoid.map((e) => EL[e]).join(', ').replace(/, (?=[^,]*$)/, ' и ');
  return `<section class="block" id="s-days"><div class="bhead"><div><h2>Мои дни</h2></div>
    <p>Сильный день (4–5 из 5) — когда приходит полезная вам стихия (${fav}) и ничто её не перебивает: для главных шагов — переговоров, запусков, оплат, публикаций. Дни нагрузки (1–2 из 5) — когда ${bad ? `приходят ${bad} или ` : ''}день бьёт по вашей карте. Нажмите на день — подскажем, что на него ставить.</p></div>
    <div class="card pane"><p class="eyebrow">Сегодня</p><div id="dsel">${dayCard(today, true, dayMore(c, a, today, days))}</div></div>
    <div class="card pane jr" id="jr"><p class="eyebrow">Проверка прогноза</p>
      <p class="dhint">Как прошёл день — по ощущению, не глядя на прогноз? Ответы показывают, работает ли расчёт лично для вас. Дата рождения не отправляется.</p>
      <div id="jrows"></div><p class="dhint" id="jmy"></p><p class="dhint" id="jall" hidden></p></div>
    <h3 style="margin-top:26px">8 недель</h3>
    <div class="dlegend"><span class="peak">сильный</span><span class="peak-hit">сильный, но с риском</span><span class="calm">ровный</span><span class="heavy">нагрузка</span></div>
    <div class="dgrid"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span>${cells}</div>
    <h3 style="margin-top:26px">Лучшие дни ближайших 45</h3><div class="dlist">${best.map((d) => dayCard(d)).join('') || '<p>Чистых сильных дней нет — ставьте важное на ровные дни.</p>'}</div>
    ${pairs.length ? `<h3 style="margin-top:26px">Связка «покажи → закрой»</h3><p class="dhint">День выражения (показать работу, продать), за ним день денег (закрыть сделку, выставить счёт): ${pairs.map(([x, y]) => `<b>${dLabel(x, false)} → ${dLabel(y, false)}</b>`).join(' · ')}.</p>` : ''}
    <div class="saved" hidden></div>
    <div class="acts dacts" style="margin-top:20px"><button class="ghost" data-push type="button">Получать мой день каждое утро</button><button class="ghost" id="ics" type="button">Сильные дни — в календарь телефона</button><button class="ghost" id="addlist" type="button">Добавить в «Мои карты»</button><button class="ghost" id="saveme" type="button">${localStorage.getItem(ME_KEY) ? 'Обновить главную карту' : 'Сделать главной («Моя карта»)'}</button><span class="dhint" id="savemsg"></span></div>
    <details class="card pane wp" style="margin-top:16px"><summary><b>Заставка на телефон</b> — карта дня сама меняется каждое утро</summary>
      <p class="dhint">Картинка на сегодня по этой карте: оценка дня, что делать, чем выровнять, лучшие часы. Сверху оставлено место под часы.</p>
      <div class="acts"><button class="ghost" id="wpcopy" type="button">Скопировать ссылку на заставку</button><a class="ghost" id="wpopen" target="_blank" rel="noopener">Открыть картинку</a></div>
      <ol class="list"><li>iPhone: «Команды» → «Автоматизация» → «+» → «Время суток»: 6:00, ежедневно, «Запускать сразу».</li>
        <li>Действие «Получить содержимое URL» — вставить скопированную ссылку.</li>
        <li>Действие «Установить обои» — экран блокировки; «Показать предпросмотр» выключить.</li>
        <li>Готово: каждое утро заставка обновится сама. Разово — откройте картинку, «Поделиться» → «Сделать обоями».</li></ol>
    </details>
  </section>`;
}
const SPHERES: [string, string][] = [['-', 'сфера (необязательно)'], ['work', 'работа'], ['money', 'деньги'], ['love', 'отношения'], ['family', 'семья'], ['health', 'здоровье'], ['mood', 'настроение']];
async function wireJournal(c: Chart, a: Analysis, today: DayInfo) {
  const box = document.getElementById('jrows'); if (!box) return;
  const q = new URLSearchParams(lastQuery || location.search.slice(1));
  if (!q.get('d') || !q.get('p')) { document.getElementById('jr')?.remove(); return; }
  const h = await chartHash(q), conf = confidence(a);
  const [y, m, d] = today.iso.split('-').map(Number), yd = new Date(y, m - 1, d - 1);
  const rows = [{ lbl: 'Сегодня', d: today }, { lbl: 'Вчера', d: dayInfo(c, a, yd.getFullYear(), yd.getMonth() + 1, yd.getDate()) }];
  const draw = () => {
    box.innerHTML = rows.map(({ lbl, d: x }, i) => { const my = myAnswer(h, x.iso);
      return `<div class="jrow" data-i="${i}"><span><b>${lbl}</b> · ${dLabel(x, false)}</span>
        <button class="ghost${my?.ans === 1 ? ' on' : ''}" data-a="1" type="button">Хорошо</button><button class="ghost${my?.ans === 0 ? ' on' : ''}" data-a="0" type="button">Тяжело</button>
        <select aria-label="Сфера дня">${SPHERES.map(([k, t]) => `<option value="${k}"${my?.sphere === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`; }).join('');
    box.querySelectorAll<HTMLButtonElement>('button[data-a]').forEach((b) => (b.onclick = async () => {
      const row = b.closest<HTMLElement>('.jrow')!, x = rows[+row.dataset.i!].d, sp = row.querySelector('select')!.value;
      const ok = await answer(h, x, +b.dataset.a! as 0 | 1, conf, sp); track('bazi:journal');
      draw(); document.getElementById('jmy')!.textContent = mySummary(h) + (ok ? '' : ' (сохранено в браузере, отправить не удалось)');
    }));
  };
  draw();
  document.getElementById('jmy')!.textContent = mySummary(h);
  document.getElementById('jall')!.textContent = await globalSummary();
}
function wireDays(c: Chart, a: Analysis) {
  const sel = document.getElementById('dsel'); if (!sel) return;
  const now = new Date(), days = daysFrom(c, a, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 64);
  document.querySelectorAll<HTMLButtonElement>('.dc').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.dc.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const d = days.find((x) => x.iso === b.dataset.iso); if (d) sel.innerHTML = dayCard(d, true, dayMore(c, a, d, days));
    sel.closest('.pane')!.querySelector('.eyebrow')!.textContent = b.classList.contains('now') ? 'Сегодня' : 'Выбранный день';
  }));
  const wq = new URLSearchParams(lastQuery || location.search.slice(1)), wp = new URLSearchParams();
  for (const k of ['d', 't', 'p', 'g']) { const v = wq.get(k); if (v) wp.set(k, v); }
  { const ap = current && loadPast(current.input).apply; if (ap) wp.set('u', encodeSet(ap)); }
  try { wp.set('z', Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { /* нет Intl — день по поясу рождения */ }
  const wurl = `${location.origin}/bazi/zastavka.png?${wp}`, wo = document.getElementById('wpopen') as HTMLAnchorElement | null, wc = document.getElementById('wpcopy');
  if (wo) wo.href = wurl;
  if (wc) wc.onclick = async () => { try { await navigator.clipboard.writeText(wurl); wc.textContent = 'Ссылка скопирована'; } catch { prompt('Ссылка на заставку', wurl); } };
  void wireJournal(c, a, days[0]);
  const sh = document.getElementById('share');
  if (sh) sh.onclick = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); sh.textContent = 'Ссылка скопирована'; }
    } catch { /* пользователь закрыл окно — ничего не делаем */ }
  };
  const pdf = document.getElementById('pdf');
  if (pdf) pdf.onclick = () => { document.querySelectorAll<HTMLDetailsElement>('#out details').forEach((d) => { if (!d.closest('.deep')) d.open = true; }); print(); };
  const cf = document.getElementById('cf') as HTMLFormElement | null;
  if (cf) cf.onsubmit = async (e) => {
    e.preventDefault();
    const o = document.getElementById('cf-out')!, val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
    const q = val('cf-p').trim(), pl = q ? (await findPlaces(q, 1))[0] : null;
    if (q && !pl) { o.textContent = 'Не нашёл такой город — уточните название.'; return; }
    const inp: BirthInput = { date: val('cf-d'), time: val('cf-t') || '12:00', timeKnown: !!val('cf-t'), tz: pl?.tz ?? c.input.tz, lat: pl?.lat ?? c.input.lat, lon: pl?.lon ?? c.input.lon, male: val('cf-g') === 'm' };
    const c2 = computeChart(inp, DEFAULT_VARIANT), r = compat(c, a, c2, analyze(c2));
    const TONE: Record<string, string> = { good: 'легче', bad: 'труднее', mixed: 'смешанно' };
    o.innerHTML = `<h3>${esc(r.summary)}</h3><div class="cf-sph">${r.spheres.map((x) => `<span class="fm-t ${x.tone}">${x.title}: ${TONE[x.tone]}</span>`).join('')}</div>${r.spheres.map((x) => `<h4 class="sub">${x.title}</h4>${r.items.filter((i) => i.sphere === x.key).map((i) => noteHtml({ title: i.title, text: i.text, quote: i.quote, src: i.src, tone: i.tone })).join('')}`).join('')}`;
  };
  const icsB = document.getElementById('ics');
  if (icsB) icsB.onclick = () => {
    const t = new Date(), ds = daysFrom(c, a, new Date(t.getFullYear(), t.getMonth(), t.getDate()), 90).filter((d) => d.type === 'peak');
    const url = URL.createObjectURL(new Blob([daysIcs(ds, c.input.place ? `${c.input.date}, ${c.input.place}` : c.input.date)], { type: 'text/calendar' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'bazi-silnye-dni.ics' });
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    document.getElementById('savemsg')!.textContent = `Файл с ${ds.length} сильными днями на 90 дней: откройте его — телефон добавит события в календарь.`;
  };
  const al = document.getElementById('addlist');
  if (al) al.onclick = () => {
    const q = lastQuery || location.search.slice(1), xs = loadSaved();
    const def = `${c.input.date.split('-').reverse().join('.')} · ${c.input.place ?? ''}`.trim();
    const label = (prompt('Как подписать карту?', def) ?? '').trim();
    if (!label) return;
    storeSaved([...xs.filter((x) => x.q !== q), { q, label }].slice(-30));
    document.getElementById('savemsg')!.textContent = 'Добавлено в «Мои карты» — список вверху страницы и здесь.';
    renderSaved();
  };
  renderSaved();
  const sv = document.getElementById('saveme');
  if (sv) sv.onclick = () => { localStorage.setItem(ME_KEY, lastQuery || location.search.slice(1)); document.getElementById('savemsg')!.textContent = 'Сохранено в этом браузере. Ссылка «Моя карта» вверху откроет её сразу.'; sv.textContent = 'Обновить главную карту'; document.getElementById('melink')?.removeAttribute('hidden'); };
}

function secCompat() {
  return `<section class="block" id="s-compat"><div class="bhead"><div><h2>Совместимость</h2></div><p>Сравниваем две карты целиком: что каждый даёт другому в чувствах, поддержке и деньгах. Итог — легче или труднее, без «можно/нельзя».</p></div>
    <div class="card pane"><p class="dhint" style="margin-top:0">Данные партнёра: дата, время (если известно), город и пол.</p><form class="askf cf" id="cf"><input id="cf-d" type="date" required aria-label="Дата рождения партнёра" /><input id="cf-t" type="time" aria-label="Время (если известно)" />
      <input id="cf-p" placeholder="Город (если пусто — как у вас)" /><select id="cf-g" aria-label="Пол"><option value="f">Женщина</option><option value="m">Мужчина</option></select><button class="go" type="submit">Сравнить</button></form>
      <div class="ans" id="cf-out"></div></div></section>`;
}

function secAsk() {
  return `<section class="block"><div class="bhead"><div><h2>Спросить карту</h2></div><p>Ответ строится только из вашего разбора выше — без выдуманных чисел.</p></div>
    <div class="card pane"><form class="askf" id="askf"><input id="askq" placeholder="Ваш вопрос о карте" aria-label="Ваш вопрос о карте" /><button class="go" type="submit">Спросить</button></form><div class="ans" id="ans"></div></div></section>`;
}
// ——— Сверка по прошлому: годы, когда было явно хорошо или плохо (calibrate.ts) ———
interface Past { evs: LifeEvent[]; apply?: Pick<Hypo, 'yong' | 'xi' | 'ji' | 'label'> }
const pastKey = (i: BirthInput) => `bazi-past:${i.date}:${i.timeKnown ? i.time : '-'}:${i.male ? 'm' : 'f'}`;
const loadPast = (i: BirthInput): Past => { try { return JSON.parse(localStorage.getItem(pastKey(i)) || '{"evs":[]}'); } catch { return { evs: [] }; } };
const storePast = (i: BirthInput, p: Past) => { try { localStorage.setItem(pastKey(i), JSON.stringify(p)); } catch { /* storage off */ } };

function secPast(c: Chart, past: Past) {
  const y0 = c.local.y, y1 = new Date().getFullYear();
  const sph = (Object.keys(SPHERE_RU) as Sphere[]).map((k) => `<option value="${k}">${SPHERE_RU[k]}</option>`).join('');
  return `<section class="block" id="s-past"><div class="bhead"><div><h2>Сверка с вашей жизнью</h2></div>
    <p>Отметьте 5–10 лет, когда было явно хорошо или явно плохо: деньги, работа, любовь, переезд, здоровье. Дни, отмеченные в «Проверке прогноза», тоже учитываются. Мы проверим, совпадает ли с ними разбор, и если ваша жизнь лучше объясняется другим раскладом — перестроим под неё. Данные остаются в этом браузере.</p></div>
    <div class="card pane">${past.apply ? `<p class="dhint" style="margin-top:0">Сейчас разбор настроен по вашим событиям (${esc(past.apply.label)}). <button class="ghost" id="preset" type="button">Вернуть разбор по формуле</button></p>` : ''}
      <form class="askf cf pf" id="pf"><input id="pf-y" type="number" min="${y0}" max="${y1}" placeholder="Год" required aria-label="Год события" />
      <select id="pf-g" aria-label="Каким был год"><option value="1">хорошо</option><option value="0">плохо</option></select>
      <select id="pf-s" aria-label="Сфера">${sph}</select><input id="pf-n" maxlength="80" placeholder="Что было (необязательно)" aria-label="Что было" />
      <button class="go" type="submit">Добавить</button></form>
      <div id="pev"></div><div class="acts dacts"><button class="ghost" id="pcheck" type="button">Проверить разбор</button></div>
      <div class="ans" id="pout"></div></div></section>`;
}

function wirePast(c: Chart, a: Analysis, input: BirthInput) {
  const f = document.getElementById('pf') as HTMLFormElement | null;
  if (!f) return;
  const list = document.getElementById('pev')!, out = document.getElementById('pout')!;
  const draw = () => {
    const p = loadPast(input);
    list.innerHTML = p.evs.length ? `<ul class="pev">${p.evs.map((e, i) => `<li>${e.year} — ${e.good ? 'хорошо' : 'плохо'}${e.sphere ? `, ${SPHERE_RU[e.sphere]}` : ''}${e.note ? `: ${esc(e.note)}` : ''} <button class="ghost" type="button" data-del="${i}" aria-label="Убрать">×</button></li>`).join('')}</ul>` : '<p class="dhint">Пока пусто.</p>';
    list.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => (b.onclick = () => { const q = loadPast(input); q.evs.splice(+b.dataset.del!, 1); storePast(input, q); draw(); }));
  };
  draw();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const y = +(document.getElementById('pf-y') as HTMLInputElement).value;
    if (!y) return;
    const p = loadPast(input);
    p.evs = p.evs.filter((x) => x.year !== y);
    p.evs.push({ year: y, good: (document.getElementById('pf-g') as HTMLSelectElement).value === '1', sphere: (document.getElementById('pf-s') as HTMLSelectElement).value as Sphere, note: (document.getElementById('pf-n') as HTMLInputElement).value.trim() || undefined });
    p.evs.sort((x, z) => x.year - z.year);
    storePast(input, p); f.reset(); draw();
  });
  document.getElementById('preset')?.addEventListener('click', () => { const p = loadPast(input); delete p.apply; storePast(input, p); build(current!.input, current!.variant); document.getElementById('s-past')?.scrollIntoView({ block: 'start' }); });
  document.getElementById('pcheck')!.onclick = async () => {
    const p = loadPast(input);
    // Отмеченные в журнале дни тоже идут в сверку (день весит треть года).
    let days: { iso: string; good: boolean }[] = [];
    try { days = myDays(await chartHash(new URLSearchParams(lastQuery || location.search.slice(1)))); } catch { /* нет crypto */ }
    // Проверяем разбор «по формуле», даже если сейчас применён другой расклад.
    const base = p.apply ? analyze(c) : a, r = calibrate(c, base, p.evs, days);
    let html = `<p>${esc(r.text)}</p>`;
    if (r.verdict !== 'few') html += `<p class="dhint">Варианты: ${r.hypos.slice(0, 4).map((h) => `${esc(h.label)} — ${[p.evs.length ? `годы ${h.hits} из ${p.evs.length}` : '', days.length ? `дни ${h.dHits} из ${days.length}` : ''].filter(Boolean).join(', ')}`).join('; ')}.</p>`;
    if (r.verdict !== 'few' && !input.timeKnown) {
      const hs = rankHours(input, p.evs).slice(0, 3);
      html += `<p class="dhint">Время рождения неизвестно. Лучше всего ваши годы объясняет рождение около ${hs.map((h) => `${h.time} (${h.hits} из ${p.evs.length})`).join(', ')} — проверьте по документам или у родных.</p>`;
    }
    if (r.verdict === 'changed') html += `<p><button class="go" id="papply" type="button">Перестроить разбор под мою жизнь</button></p>`;
    out.innerHTML = html;
    document.getElementById('papply')?.addEventListener('click', () => {
      storePast(input, { ...p, apply: { yong: r.best.yong, xi: r.best.xi, ji: r.best.ji, label: r.best.label } });
      build(current!.input, current!.variant); document.getElementById('s-past')?.scrollIntoView({ block: 'start' });
    });
    track('bazi:past');
  };
}

// ——— Слепой тест «узнаёте себя?» (до чтения разбора): свой портрет против двух случайных чужих ———
const recogKey = (i: BirthInput) => `bazi-recog:${i.date}:${i.timeKnown ? i.time : '-'}:${i.male ? 'm' : 'f'}`;
let recogOwn = -1;
// v2 (06.10): тест по портрету KB 18 (тип, черта/тень, точка срыва), а не по стиху ствола.
function charText(c: Chart, a: Analysis) { return describe(c, a).lines.slice(0, 3); }
/** Тест вслепую: снят со страницы 08.10 (честен только до чтения портрета). */
export function secRecog(c: Chart, a: Analysis, input: BirthInput) {
  if (localStorage.getItem(recogKey(input))) return '';
  // псевдослучайно, но стабильно для карты: чужие карты с другим господином дня
  let seed = [...(input.date + input.time)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const texts: string[][] = [charText(c, a)];
  for (let k = 0; texts.length < 3 && k < 40; k++) {
    const t = new Date(Date.UTC(1955, 0, 1) + rnd() * 54 * 365.25 * 864e5).toISOString().slice(0, 10);
    const c2 = computeChart({ ...input, date: t, time: '12:00', timeKnown: true }, DEFAULT_VARIANT), a2 = analyze(c2);
    const t2 = charText(c2, a2);
    // чужой портрет должен отличаться от своего и от уже взятого хотя бы в двух строках
    if (texts.some((x) => x.filter((l, i) => l === t2[i]).length >= 2)) continue;
    texts.push(t2);
  }
  const order = [0, 1, 2].sort(() => rnd() - 0.5);
  recogOwn = order.indexOf(0);
  return `<section class="block" id="s-recog"><div class="bhead"><div><h2>Проверить точность вслепую</h2></div>
    <p>30 секунд, лучше до чтения разбора ниже.</p></div>
    <p class="rc-how">Какое из трёх описаний больше про вас? Одно построено по вашей карте, два — по случайным чужим. Так мы честно проверяем, работает ли метод, а не «подходит всем».</p>
    <div class="recog">${order.map((i, k) => `<button class="card pane rc" type="button" data-k="${k}">${texts[i].map((x) => `<p>${esc(x)}</p>`).join('')}</button>`).join('')}</div>
    <p class="acc"><button class="ghost" id="rskip" type="button">Пропустить</button></p><div class="ans" id="rout"></div></section>`;
}
function wireRecog(input: BirthInput) {
  const sec = document.getElementById('s-recog'); if (!sec) return;
  const done = (msg: string) => { sec.querySelector('.recog')!.remove(); document.getElementById('rskip')?.remove(); document.getElementById('rout')!.textContent = msg; };
  document.getElementById('rskip')!.onclick = () => { localStorage.setItem(recogKey(input), 'skip'); sec.remove(); };
  sec.querySelectorAll<HTMLButtonElement>('.rc').forEach((b) => (b.onclick = async () => {
    const hit = +b.dataset.k! === recogOwn;
    localStorage.setItem(recogKey(input), hit ? '1' : '0');
    done(hit ? 'Вы выбрали описание по своей карте. Ниже — полный разбор.' : 'Это было описание чужой карты. Ваше — ниже, в разборе; честно: один ответ ничего не доказывает, важна сумма по всем людям.');
    try { await sendRecog(await chartHash(new URLSearchParams(lastQuery || location.search.slice(1))), hit); } catch { /* офлайн */ }
    const g = await recogSummary(); if (g) document.getElementById('rout')!.textContent += ' ' + g;
    track('bazi:recog');
  }));
}

function secFeedback() {
  return `<section class="block" id="s-fb"><div class="bhead"><div><h2>Разбор попал?</h2></div><p>Нам важно, где непонятно или мимо — читаем каждое сообщение. Дата рождения не отправляется.</p></div>
    <div class="card pane"><div class="dacts fbv" id="fbv"><button class="ghost" type="button" data-ok="1">Да, это я</button><button class="ghost" type="button" data-ok="0">Мимо</button></div>
    <form class="askf" id="fbf"><input id="fbq" maxlength="1500" placeholder="Что было неточно?" aria-label="Что было непонятно или неточно" /><button class="go" type="submit">Отправить</button></form><div class="ans" id="fbmsg"></div></div></section>`;
}
function secHonest() {
  return `<section class="block"><div class="card pane honest"><h3>Честно о Бацзы</h3>
    <p>Расчёт карты точный: сезоны — по положению Солнца, время — истинное солнечное для места рождения. Толкования — традиция, а не наука: исследований, подтверждающих связь даты рождения с судьбой, нет. Используйте карту как язык самоанализа и планирования — и проверяйте её на своей жизни.</p></div></section>`;
}

function wire(c: Chart, a: Analysis, charts: { v: Variant; c: Chart; a: Analysis }[]) {
  const lkr = document.getElementById('lkr')!;
  document.querySelectorAll<HTMLButtonElement>('.lk').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.lk.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const l = c.luck[+b.dataset.i!], r = luckR(c, a, l.idx);
    lkr.innerHTML = `<b>${l.year}–${l.year + 9} · ${Math.floor(l.age)}–${Math.floor(l.age) + 9} лет.</b> ${esc(r.text)} ${esc(luckDetail(c, a, l.idx).join(' '))}`;
  }));
  document.querySelectorAll<HTMLButtonElement>('.vt button[data-v]').forEach((b) => (b.onclick = () => {
    sessionStorage.setItem('bazi-scrolled', '1');
    build(current!.input, charts[+b.dataset.v!].v);
    document.querySelector('.vt')?.scrollIntoView({ block: 'center' });
    sessionStorage.removeItem('bazi-scrolled');
  }));
  const notes = [natureNote(a), strengthNote(c, a), axisNote(c, a), climateNote(c, a), ...comboNotes(c, a), ...bondNotes(c, a)];
  const fy = yearForecast(c, a, baziYear());
  const ctx = chartSummary(c, a) + '\n' + `Год ${fy.year} ${pillarZh(fy.idx)}: ${toneRu(fy.tone)}, ${fy.text}. Месяцы: ${fy.months.map((m) => `с ${m.start.toISOString().slice(0, 10)} ${pillarZh(m.idx)} ${toneRu(m.tone)}`).join('; ')}.` + '\n' + spheres(c, a).map((x) => `${x.title}: ${x.lead} ${x.points.join(' ')} Что делать: ${x.todo}`).join('\n') + '\n' + a.consensus.map((e) => EL_NEED[e]).join('\n') + '\n' + notes.map((n) => `${n.title}: ${n.text}${n.src ? ` (${n.src})` : ''}`).join('\n');
  document.getElementById('askf')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (document.getElementById('askq') as HTMLInputElement).value.trim(), ans = document.getElementById('ans')!;
    if (!q) return;
    ans.textContent = 'Думаю над картой…';
    const r = await ask(`${q}\n(Отвечай как знаток Бацзы, опираясь на разбор карты.)`, [], ctx);
    ans.textContent = r.text;
  });
  const fbmsg = document.getElementById('fbmsg')!, thanks = (ok: boolean) => (fbmsg.textContent = ok ? 'Спасибо, получили.' : 'Не отправилось — попробуйте позже.');
  document.querySelectorAll<HTMLButtonElement>('#fbv button').forEach((b) => (b.onclick = async () => {
    document.querySelectorAll<HTMLButtonElement>('#fbv button').forEach((x) => (x.disabled = true));
    thanks(await sendFeedback({ kind: 'clear', id: 'bazi', ok: b.dataset.ok === '1' }));
  }));
  document.getElementById('fbf')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('fbq') as HTMLInputElement, text = q.value.trim();
    if (!text) return;
    const ok = await sendFeedback({ kind: 'note', text: `[бацзы] ${text}` });
    if (ok) q.value = '';
    thanks(ok);
  });
  let rt = 0;
  onresize = () => { clearTimeout(rt); rt = window.setTimeout(() => drawLinks(c, a, false), 150); };
}

// ——— Старт: из адреса ———
(() => {
  document.getElementById('f')!.insertAdjacentHTML('afterend', '<div class="saved" id="saved-top" hidden></div>');
  renderSaved();
  let q = new URLSearchParams(location.search);
  const me = localStorage.getItem(ME_KEY);
  if (me) document.getElementById('melink')?.removeAttribute('hidden');
  if (q.has('me') && me) { q = new URLSearchParams(me); history.replaceState(null, '', `?${me}`); }
  const d = q.get('d'), p = q.get('p');
  if (!d || !p) return;
  lastQuery = q.toString();
  const [lat, lon, tz, ...name] = p.split(',');
  const t = q.get('t') ?? '12:00';
  fd.value = d; ft.value = t === '-' ? '12:00' : t; fnt.checked = t === '-'; ft.disabled = fnt.checked; fp.value = name.join(',');
  chosen = { name: name.join(','), ru: name.join(','), lat: +lat, lon: +lon, tz, cc: '' };
  fp.value = name.join(',');
  const g = q.get('g') === 'f' ? 'f' : 'm';
  (document.querySelector(`input[name=g][value=${g}]`) as HTMLInputElement).checked = true;
  sessionStorage.setItem('bazi-scrolled', '1');
  build({ date: d, time: t === '-' ? '12:00' : t, timeKnown: t !== '-', tz, lat: +lat, lon: +lon, male: g === 'm', place: name.join(',') });
  sessionStorage.removeItem('bazi-scrolled');
})();
void [SEASON_STATE];

// Приложение (PWA): офлайн-кэш раздела /bazi/; в dev не регистрируем.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { navigator.serviceWorker.register('/bazi-sw.js', { scope: '/bazi/' }).catch(() => {}); });
}

// ——— Вторая проверка полезной стихии («судья», очередь /api/judge → воркер на VPS). Только при известном времени.
let judgeRun = 0;
function wireJudge(c: Chart, a: Analysis) {
  const box = document.getElementById('judge'); if (!box) return;
  const run = ++judgeRun, idx = (pos: string) => c.pillars.find((p) => p.pos === pos)!.idx;
  const p = ['year', 'month', 'day', 'hour'].map(idx).join('_'), mine = a.brain.yong;
  const show = (html: string) => { if (run !== judgeRun) return; box.hidden = false; box.innerHTML = html; };
  const done = (el: number | null) => {
    if (el === null || el === undefined) { box.hidden = true; return; }
    if (el === mine) show(`<b>Вторая проверка согласна:</b> главное для вас — ${EL[mine].toLowerCase()}. Два независимых разбора сошлись — этому выводу можно доверять больше обычного.`);
    else { box.className = 'conf low judge'; show(`<b>Вторая проверка видит иначе:</b> возможно, главное для вас — ${EL[el].toLowerCase()}, а не ${EL[mine].toLowerCase()}. Карта спорная: держите в голове оба варианта. Если годы, когда было много стихии «${EL[el].toLowerCase()}», были у вас удачнее, — ближе второй вариант.`); }
    track(`bazi:judge:${el === mine ? 'agree' : 'differ'}`);
  };
  const ask = async (method: 'POST' | 'GET') => {
    const r = await fetch(method === 'POST' ? '/api/judge' : `/api/judge?p=${p}`, method === 'POST' ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p }) } : undefined);
    return r.ok ? r.json() : null;
  };
  (async () => {
    try {
      let j = await ask('POST'); if (!j || run !== judgeRun) return;
      if (j.status === 'busy') return;
      if (j.status !== 'done') show('Идёт вторая, независимая проверка вашей полезной стихии — ответ появится здесь через минуту-две.');
      for (let t = 0; j && j.status !== 'done' && t < 30 && run === judgeRun; t++) { await new Promise((ok) => setTimeout(ok, 8000)); j = await ask('GET'); }
      if (j && j.status === 'done' && run === judgeRun) done(j.el); else if (run === judgeRun) box.hidden = true;
    } catch { box.hidden = true; }
  })();
}
