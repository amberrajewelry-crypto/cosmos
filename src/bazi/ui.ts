import { confidence } from './confidence';
import { chartHash, answer, myAnswer, mySummary, globalSummary, myDays, sendRecog, recogSummary } from './journal';
import { reveal, wireMotion } from './motion';
import './bazi.css';
import { loadPlaces, findPlaces, placeLabel, placeDetail, type Place } from '../data/places';
import { track, sendFeedback } from '../live/feedback';
import { STEMS, EL, EL_RGB, EL_COLOR, yearsRu, SEASON_STATE } from './core';
import { computeChart, analyze, allVariants, DEFAULT_VARIANT, type BirthInput, type Chart, type Analysis, type Variant } from './calc';
import { luckYears } from './calc';
import { mountFx } from './fx';
import { DM_TEXT, EL_NEED, chartSummary } from './interp';
import { describe } from './describe';
import { natureNote, strengthNote, axisNote, climateNote, comboNotes, bondNotes, luckDetail } from './reading';
import { spheres } from './spheres';
import { compat } from './compat';
import { calibrate, applyHypo, rankHours, encodeSet, SPHERE_RU, type LifeEvent, type Hypo, type Sphere } from './calibrate';
import { daysIcs } from './ics';
import { yearForecast, baziYear, pillarZh, toneRu } from './forecast';
import { daysFrom, type DayInfo, dayInfo } from './days';
import { lifeLine } from './lifeline';
import { shareCard, incomingRef, cameByRef, myRef } from './sharecard';
import { $, esc, rgb, lbl, ANIMAL, animalSm, lay, luckR, ME_KEY } from './ui-kit';
import { whenAnim, frameCost, animSlow } from './anim-gate';
import { secRasklad, secTrait, secWho, secPillars, drawLinks, secElements, secSeason, luckWhen, secLuck, noteHtml, secForecast, secSpheres, pushCta, secRazbor, secCompat, secPro, secFeedback, secHonest } from './ui-sections';
import { dayCard, dayMore, dLabel, secDays, WP_SHORTCUT } from './ui-days';
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
  let lastQ = 0; const qiCost = frameCost();
  const frame = (now = 0) => {
    if (now - lastQ < 31) { if (!reduce) requestAnimationFrame(frame); return; } // фон — 30 кадров в секунду
    if (animSlow()) return;
    lastQ = now; t += 0.0032; const T0 = performance.now();
    ctx.fillStyle = 'rgba(7,6,26,0.22)'; ctx.fillRect(0, 0, W, H);
    for (const p of ps) {
      const a = Math.sin(p.x * 0.0021 + t * 3) * 1.6 + Math.cos(p.y * 0.0027 - t * 2) * 1.6 + p.e * 1.2566;
      p.x += Math.cos(a) * p.s * 2; p.y += (Math.sin(a) * p.s - 0.15) * 2; p.life -= 2;
      if (p.life < 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) Object.assign(p, spawn());
      ctx.fillStyle = `rgba(${EL_RGB[p.e]},${0.12 + 0.22 * Math.sin(p.life * 0.02) ** 2})`;
      ctx.fillRect(p.x, p.y, 1.4, 1.4);
    }
    if (qiCost(performance.now() - T0, 6)) return; // фон дороже 6 мс в кадре — останавливаем
    if (!reduce) requestAnimationFrame(frame);
  };
  whenAnim(() => frame());
  return { tint(w: number[]) { const s = w.reduce((a, b) => a + b, 0); weights = w.map((x) => x / s); ps.forEach((p) => (p.e = pickEl())); } };
})();

// ——— Флагманская мандала: 12 животных по кругу, 5 живых стихий внутри ———
(() => {
  const o = document.getElementById('orbit');
  if (!o) return;
  const ring = ANIMAL.map((_, b) => `<span style="--a:${b * 30}deg"><img src="${animalSm(b)}" alt="" /></span>`).join('');
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
if (incomingRef()) track('bazi:ref:in'); // пришёл по чужой карточке
// Приглашение «сравнить карты»: ?pair=<d,t,p,g пригласившего>. Держим до построения своей карты.
{ const pr = new URLSearchParams(location.search).get('pair'); if (pr) { try { sessionStorage.setItem('bazi-pair', pr); } catch { /* нет хранилища */ } track('bazi:pair:in'); } }
let pairGeo: { label: string; lat: number; lon: number; tz: string } | null = null;
const pairInvite = (): URLSearchParams | null => { try { const v = sessionStorage.getItem('bazi-pair'); const q = v ? new URLSearchParams(v) : null; return q?.get('d') ? q : null; } catch { return null; } };
if (pairInvite() && !new URLSearchParams(location.search).get('d')) msg.textContent = 'Вас пригласили сравнить карты. Введите свои данные — пару покажем сразу.';
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, b = t.closest<HTMLElement>('button[id]'), sm = t.closest('summary');
  if (b && TRACKED.has(b.id)) track(`bazi:${b.id}`);
  if (sm) track(`bazi:open:${sm.closest('section')?.querySelector('h2')?.textContent?.slice(0, 24) ?? '?'}`);
});
document.addEventListener('submit', (e) => { const id = (e.target as HTMLElement).id; if (id === 'askf' || id === 'cf') track(`bazi:${id}`); });
fnt.addEventListener('change', () => (ft.disabled = fnt.checked));

const voiceBtn = $<HTMLButtonElement>('voice');
// голос и «спросить карту» — отдельные модули по требованию, в первую загрузку не входят
if (new URLSearchParams(location.search).has('voice')) void import('../ui/listen').then(({ canListen, listen }) => {
  if (!canListen()) return;
  voiceBtn.hidden = false;
  voiceBtn.onclick = async () => {
    const { parseSpokenBirth, matchSpokenPlace } = await import('../ui/voice-parse');
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
});

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
/** Значки разделов-плиток: линия 1.6, 24×24, цвет — от раздела (--ic). */
const SEC_IC: [RegExp, string, string][] = [
  [/дни/i, '#5fc98a', '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2.2"/>'],
  [/год/i, '#e2c47c', '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/><path d="M12 12l4-3"/>'],
  [/расклад/i, '#c9a85c', '<path d="M12 3l2.4 5.6L20 9.5l-4.3 3.9 1.2 5.9L12 16.4l-4.9 2.9 1.2-5.9L4 9.5l5.6-.9z"/>'],
  [/совмест/i, '#ef7a8a', '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'],
  [/характер/i, '#9dc0ff', '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>'],
  [/сфер/i, '#5fc98a', '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>'],
  [/такт/i, '#d6a64f', '<path d="M3 17l5-6 4 3 4-7 5 5"/><path d="M3 20.5h18"/>'],
  [/сверк/i, '#9fe3b7', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  [/спрос/i, '#9dc0ff', '<path d="M4.5 5.5h15v10h-8l-4.5 4v-4h-2.5z"/>'],
  [/столп/i, '#c9a85c', '<path d="M5 20V7M10 20V4M14 20V4M19 20V7M3 20.5h18"/>'],
  [/стихи/i, '#ef5a3c', '<path d="M12 3.5l8 6-3 9.5H7l-3-9.5z"/>'],
  [/сезон/i, '#4f8ef0', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
  [/честно/i, '#5fc98a', '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'],
  [/точност|вслепую/i, '#e2c47c', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'],
];
const secIcon = (t: string) => { const m = SEC_IC.find(([r]) => r.test(t)); return m ? `<i class="f-ic" style="--ic:${m[1]}" aria-hidden="true"><svg viewBox="0 0 24 24">${m[2]}</svg></i>` : ''; };
/** Разделы после «Кто вы» — свёрнутые плитки: заголовок + одна строка, содержимое по нажатию. */
const openSecs = new Set<string>();
let onToggle: ((e: Event) => void) | null = null;
function fold(out: HTMLElement) {
  out.querySelectorAll<HTMLElement>('section.block').forEach((s) => {
    const head = s.querySelector<HTMLElement>(':scope > .bhead');
    if (!head || s.id === 's-fb') return;
    const h2 = head.querySelector('h2')!, lead = head.querySelector(':scope > p:not(.acc):not(.ev)'), acc = head.querySelector(':scope > p.acc'), ev = head.querySelector(':scope > p.ev');
    const key = s.id || h2.textContent!;
    const d = document.createElement('details');
    d.className = 'fold'; d.dataset.key = key; d.open = openSecs.has(key);
    d.innerHTML = `<summary>${secIcon(h2.textContent || '')}<span class="f-t"><h2>${h2.innerHTML}</h2>${lead ? `<small>${lead.innerHTML}</small>` : ''}</span><i class="f-ch" aria-hidden="true"></i></summary>`;
    const body = document.createElement('div'); body.className = 'f-body';
    head.remove(); if (ev) body.append(ev); if (acc) body.append(acc);
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
  out.innerHTML = [example ? '<section class="block ex-note"><div class="card pane"><p><b>Это пример</b> — разбор Стива Джобса (24.02.1955, 19:15, Сан-Франциско). Так будет выглядеть и ваш.</p><button class="go" id="ex-own" type="button">Построить свою карту</button></div></section>' : '', secWho(c, a), example ? '' : pushCta(), '<p class="fold-hint">Откройте нужный раздел</p>', secDays(c, a), secForecast(c, a), secRasklad(c, a), secCompat(), example ? '' : secPro(),
    `<section class="block deep"><details class="more"><summary><h2>Для тех, кому интересно глубже</h2><p>Устройство карты, такты, сферы жизни, сверка с прошлым.</p></summary>`,
    secTrait(c, a), secSpheres(c, a), secLuck(c, a), secPast(c, past), secPillars(c, a), secElements(c, a, charts, !!(current && loadPast(current.input).apply)), secSeason(c), secRazbor(c, a),
    '</details></section>', secFeedback(), secHonest()].join('');
  track('bazi:build'); if (cameByRef()) { try { if (!sessionStorage.getItem('bazi-ref-b')) { sessionStorage.setItem('bazi-ref-b', '1'); track('bazi:ref:build'); } } catch { /* нет хранилища */ } } // один раз за сессию, иначе K завышен
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
    wirePro();
    const own = document.getElementById('ex-own');
    if (own) own.onclick = () => { fd.value = ''; ft.value = ''; fp.value = ''; chosen = undefined; history.replaceState(null, '', location.pathname); lastQuery = ''; out.hidden = true; $('f').scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => fd.focus(), 400); };
    if (input.timeKnown) wireJudge(c, a);
  });
  if (!sessionStorage.getItem('bazi-scrolled')) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ——— Утренняя карточка дня (Web Push: /api/push, рассылка tools/push_worker.ts в 8:00 по поясу человека) ———
const VAPID_PUBLIC = 'BAtafqYtBLaVo0Hdz37tmWAPbdl4KsKLTImwFW3nXXCJU9BEjwhEWNrUQ0bYFB_tASdD7CUImFgr-YnWukGH_1I';
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
  const label = (on: boolean) => btns.forEach((b) => (b.textContent = on ? 'Отключить утренний день' : 'Мой день — каждое утро'));
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (ios && !standalone) { btns.forEach((b) => (b.onclick = () => { say(''); msgs.forEach((m) => (m.innerHTML = '<ol class="ios-steps"><li>Внизу Safari нажмите «Поделиться» (квадрат со стрелкой).</li><li>Выберите «На экран „Домой“» → «Добавить».</li><li>Откройте сайт с новой иконки и нажмите эту кнопку ещё раз.</li></ol>')); track('bazi:push:ios-hint'); })); return; }
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
  // Ответ из кнопки пуша «Вчера: хорошо/тяжело» (?jy=1|0, public/bazi-sw.js): записать, если вчера ещё не отмечен, и убрать параметр
  const jy = new URLSearchParams(location.search).get('jy');
  if ((jy === '1' || jy === '0') && !myAnswer(h, rows[1].d.iso)) { await answer(h, rows[1].d, +jy as 0 | 1, conf); track('bazi:journal-push'); }
  if (jy !== null) { const u = new URL(location.href); u.searchParams.delete('jy'); history.replaceState(history.state, '', u.href); }
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
  const wi = document.getElementById('wpinstall');
  if (wi) wi.onclick = async () => { try { await navigator.clipboard.writeText(wurl); } catch { prompt('Скопируйте ссылку на заставку', wurl); } location.href = WP_SHORTCUT; };
  const live = () => void import('./wp-live').then((m) => m.openLive(c, a));
  const wl = document.getElementById('wplive'); if (wl) wl.onclick = live;
  if (new URLSearchParams(location.search).has('live')) live();
  void wireJournal(c, a, days[0]);
  const gd = document.getElementById('go-days');
  if (gd) gd.onclick = (e) => { const f = document.querySelector<HTMLDetailsElement>('#s-days details.fold'); if (!f) return; e.preventDefault(); f.open = true; track('bazi:today-line'); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  // «Сверка с вашей жизнью» лежит в свёрнутых разделах: ссылка раскрывает все уровни и прокручивает к ней
  document.querySelectorAll<HTMLAnchorElement>('a.go-past').forEach((l) => (l.onclick = (e) => {
    const s = document.getElementById('s-past'); if (!s) return; e.preventDefault();
    for (let d = s.closest('details'); d; d = d.parentElement?.closest('details') ?? null) (d as HTMLDetailsElement).open = true;
    track('bazi:go-past'); s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  const sh = document.getElementById('share');
  if (sh) sh.onclick = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); sh.textContent = 'Ссылка скопирована'; }
    } catch { /* пользователь закрыл окно — ничего не делаем */ }
  };
  const sc = document.getElementById('scard');
  if (sc) sc.onclick = async () => {
    const Y = baziYear(), yf = yearForecast(c, a, Y), txt = lay(yf.text);
    try {
      const r = await shareCard({ title: DM_TEXT[a.dm].title, year: Y, yearTone: toneRu(yf.tone), yearLine: txt.charAt(0).toUpperCase() + txt.slice(1) + '.', pts: lifeLine(c, a), nowYear: new Date().getFullYear(), color: EL_COLOR[STEMS[a.dm].el] });
      track(`bazi:scard:${r}`); if (r === 'saved') sc.textContent = 'Картинка сохранена';
    } catch { /* закрыл окно «поделиться» */ }
  };
  const pinv = document.getElementById('pinv');
  if (pinv) pinv.onclick = async () => {
    const url = `${location.origin}/bazi?r=${myRef()}&pair=${encodeURIComponent(chartQuery())}`;
    try { if (navigator.share) await navigator.share({ title: 'Сравним наши карты?', text: 'Посмотри, как сочетаются наши карты по бацзы:', url }); else { await navigator.clipboard.writeText(url); pinv.textContent = 'Ссылка скопирована'; } track('bazi:pair:sent'); } catch { /* закрыл окно */ }
  };
  const pi = pairInvite(), cfx = document.getElementById('cf') as HTMLFormElement | null;
  if (pi && cfx && chartQuery() !== pi.toString()) setTimeout(() => {
    const set = (id: string, v: string) => ((document.getElementById(id) as HTMLInputElement).value = v);
    const pp = (pi.get('p') || '').split(',');
    set('cf-d', pi.get('d')!); set('cf-t', pi.get('t') && pi.get('t') !== '-' ? pi.get('t')! : ''); set('cf-p', pp.slice(3).join(',')); if (pp.length >= 4 && Number.isFinite(+pp[0]) && Number.isFinite(+pp[1])) pairGeo = { label: pp.slice(3).join(','), lat: +pp[0], lon: +pp[1], tz: pp[2] }; set('cf-g', pi.get('g') === 'm' ? 'm' : 'f');
    try { sessionStorage.removeItem('bazi-pair'); } catch { /* нет хранилища */ }
    const det = document.querySelector<HTMLDetailsElement>('#s-compat details.fold'); if (det) det.open = true;
    cfx.requestSubmit(); track('bazi:pair:build');
    setTimeout(() => document.getElementById('s-compat')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
  }, 0);
  const pdf = document.getElementById('pdf');
  if (pdf) pdf.onclick = () => { document.querySelectorAll<HTMLDetailsElement>('#out details').forEach((d) => { if (!d.closest('.deep')) d.open = true; }); print(); };
  const cf = document.getElementById('cf') as HTMLFormElement | null;
  if (cf) cf.onsubmit = async (e) => {
    e.preventDefault();
    const o = document.getElementById('cf-out')!, val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
    const q = val('cf-p').trim(), pl = q ? (pairGeo && q === pairGeo.label ? pairGeo : (await findPlaces(q, 1))[0]) : null;
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

function wirePro() {
  const y = document.getElementById('pro-yes'), n = document.getElementById('pro-no'), f = document.getElementById('pro-f') as HTMLFormElement | null, m = document.getElementById('pro-m');
  if (!y || !n || !f || !m) return;
  const done = localStorage.getItem('bazi-pro');
  if (done) { y.parentElement!.hidden = true; m.textContent = done === 'yes' ? 'Спасибо — вы в списке.' : 'Понятно, спасибо.'; }
  y.onclick = () => { track('bazi:pro:yes'); try { localStorage.setItem('bazi-pro', 'yes'); } catch { /* */ } y.parentElement!.hidden = true; f.hidden = false; m.textContent = 'Спасибо! Оставьте контакт, если хотите узнать о запуске (необязательно).'; };
  n.onclick = () => { track('bazi:pro:no'); try { localStorage.setItem('bazi-pro', 'no'); } catch { /* */ } y.parentElement!.hidden = true; m.textContent = 'Понятно, спасибо.'; };
  f.onsubmit = async (e) => { e.preventDefault(); const v = (document.getElementById('pro-c') as HTMLInputElement).value.trim(); if (!v) return; const ok = await sendFeedback({ kind: 'note', text: `[бацзы pro] ${v}` }); track('bazi:pro:contact'); f.hidden = true; m.textContent = ok ? 'Записали. Напишем один раз — когда Pro запустится.' : 'Не ушло — попробуйте позже.'; };
}

export function secAsk() { // снят с экрана 16.10 (см. обработчик askf)
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

function wire(c: Chart, a: Analysis, charts: { v: Variant; c: Chart; a: Analysis }[]) {
  const lkr = document.getElementById('lkr')!;
  document.querySelectorAll<HTMLButtonElement>('.lk').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.lk.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const i = +b.dataset.i!, l = c.luck[i], r = luckR(c, a, l.idx);
    lkr.innerHTML = `<b>${luckYears(c, i)} · ${Math.floor(l.age)}–${Math.floor(l.age) + 10} ${yearsRu(Math.floor(l.age) + 10)}.</b>${luckWhen(c, i)} ${esc(r.text)} ${esc(luckDetail(c, a, l.idx).join(' '))}`;
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
  // 16.10: «Спросить карту» снят с экрана — движок puter требовал вход на чужом сайте, без входа ответ висел. Обработчик оставлен на возврат.
  document.getElementById('askf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (document.getElementById('askq') as HTMLInputElement).value.trim(), ans = document.getElementById('ans')!;
    if (!q) return;
    ans.textContent = 'Думаю над картой…';
    const { ask } = await import('../live/ask');
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
  track('bazi:view');
  try { const r = document.referrer && new URL(document.referrer).hostname; if (r && r !== location.hostname) track(`bazi:ref:${r.replace(/^www\./, '').split('.').slice(-2, -1)[0] ?? r}`); } catch { /* no-op */ }
  let q = new URLSearchParams(location.search);
  const me = localStorage.getItem(ME_KEY);
  if (me) document.getElementById('melink')?.removeAttribute('hidden');
  if (q.has('me') && me) { q = new URLSearchParams(me); history.replaceState(null, '', `?${me}`); }
  const d = q.get('d'), p = q.get('p');
  if (!d || !p || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^(\d{2}:\d{2}|-)$/.test(q.get('t') ?? '12:00')) return; // только дата/время нужного вида
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
  // 16.10 (аудит): ссылка с датой открывается сразу на разборе, а не на форме
  if (!q.has('jy') && !location.hash) requestAnimationFrame(() => $('out').scrollIntoView({ block: 'start' }));
  track('bazi:link');
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
