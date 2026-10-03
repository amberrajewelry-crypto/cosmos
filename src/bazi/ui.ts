import './bazi.css';
import { loadPlaces, findPlaces, placeLabel, placeDetail, type Place } from '../data/places';
import { canListen, listen } from '../ui/listen';
import { parseSpokenBirth, matchSpokenPlace } from '../ui/voice-parse';
import { ask } from '../live/ask';
import {
  STEMS, BRANCHES, EL, EL_RGB, EL_COLOR, GODS, godOf, hiddenOf, stageOf, STAGES, nayinOf, TERMS, SEASON_STATE, type El,
} from './core';
import {
  computeChart, analyze, allVariants, variantLabel, DEFAULT_VARIANT, POS_RU, POS_SENSE, yearIdx,
  type BirthInput, type Chart, type Analysis, type Variant, type Pos,
} from './calc';
import { mountFx, elIcon } from './fx';
import { DM_TEXT, EL_NEED, godProfile, luckReading, chartSummary } from './interp';
import { natureNote, strengthNote, axisNote, climateNote, comboNotes, bondNotes, godNatureNotes, luckDetail, portrait, type Note } from './reading';
import { daysFrom, showThenClose, DAY_TYPE, type DayInfo } from './days';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
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
fnt.addEventListener('change', () => (ft.disabled = fnt.checked));

const voiceBtn = $<HTMLButtonElement>('voice');
if (canListen()) {
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
function build(input: BirthInput, variant: Variant = DEFAULT_VARIANT) {
  current = { input, variant };
  const variants = allVariants(input);
  const charts = variants.map((v) => { const c = computeChart(input, v); return { v, c, a: analyze(c) }; });
  const c = computeChart(input, variant), a = analyze(c);
  qi.tint(a.pct.map((x) => 0.05 + x));
  const out = $('out');
  out.hidden = false;
  out.innerHTML = [secWho(c, a), secPillars(c, a), secElements(c, a, charts), secSeason(c), secDays(c, a), secLuck(c, a), secRazbor(c, a), secSchools(charts, variant), secAsk(), secHonest()].join('');
  requestAnimationFrame(() => {
    out.querySelectorAll<HTMLElement>('.pillar').forEach((el, i, all) => setTimeout(() => el.classList.add('on'), 200 + (all.length - 1 - i) * 380));
    out.querySelectorAll<HTMLElement>('.fill').forEach((el) => (el.style.width = el.dataset.w!));
    drawLinks(c, a);
    out.querySelectorAll<HTMLCanvasElement>('canvas.fxc').forEach((cv) => mountFx(cv, +cv.dataset.stem!));
    wire(c, a, charts);
    wireDays(c, a);
  });
  if (!sessionStorage.getItem('bazi-scrolled')) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stemTile(stem: number) {
  return `<div class="glyph fx" style="--rgb:${rgb(STEMS[stem].el)}"><canvas class="fxc" data-stem="${stem}" aria-label="${STEMS[stem].ru}: ${STEMS[stem].image}"></canvas></div>`;
}
function branchTile(b: number) {
  return `<div class="glyph ani" style="--rgb:${rgb(BRANCHES[b].el)}"><img src="${animalSrc(b)}" alt="${BRANCHES[b].animal}" loading="lazy" decoding="async" /></div>`;
}
const pillarRuHtml = (i: number) => { const s = STEMS[i % 10], b = BRANCHES[i % 12]; return `<span style="color:${EL_COLOR[s.el]}">${s.ru}</span> · <span style="color:${EL_COLOR[b.el]}">${b.animal}</span>`; };
const thumb = (b: number, size = 44) => `<img class="thumb" src="${animalSrc(b)}" alt="${BRANCHES[b].animal}" width="${size}" height="${size}" loading="lazy" />`;

function secWho(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], day = c.pillars.find((p) => p.pos === 'day')!, br = BRANCHES[day.branch], t = DM_TEXT[a.dm];
  const yr = c.pillars.find((p) => p.pos === 'year')!;
  const nowY = new Date().getFullYear(), cur = c.luck.find((l, i) => nowY >= l.year && (i === c.luck.length - 1 || nowY < c.luck[i + 1].year));
  const tone = cur ? luckReading(a, cur.idx).tone : 'mixed';
  return `<section class="block who" style="--rgb:${rgb(d.el)}">
    <div class="who-fx"><canvas class="fxc" data-stem="${a.dm}"></canvas></div>
    <div class="who-txt"><p class="eyebrow">Ваш Господин дня</p>
      <h2>${d.ru} — ${t.title.toLowerCase()}</h2>
      <p class="who-sub">${EL[d.el]} ${pol(d.yang)} · сила: ${a.strength} · питают: ${a.consensus.map((e) => EL[e]).join(' и ')}</p>
      ${portrait(c, a).map((l) => `<p>${esc(l)}</p>`).join('')}
      <div class="who-row">
        <div><img src="${animalSrc(day.branch)}" alt="" /><span>Животное дня<b>${br.animal}</b></span></div>
        <div><img src="${animalSrc(yr.branch)}" alt="" /><span>Животное года<b>${BRANCHES[yr.branch].animal}</b></span></div>
        ${cur ? `<div class="lt ${tone}"><img src="${animalSrc(cur.idx % 12)}" alt="" /><span>Десятилетие сейчас<b>${cur.year}–${cur.year + 9} · ${tone === 'good' ? 'подъём' : tone === 'bad' ? 'нагрузка' : 'смешанное'}</b></span></div>` : ''}
      </div></div></section>`;
}

function secPillars(c: Chart, a: Analysis) {
  const cols = c.pillars.map((p) => {
    const s = STEMS[p.stem], b = BRANCHES[p.branch], isDm = p.pos === 'day';
    const g = isDm ? '<b>Вы</b>' : `<b>${godOf(a.dm, p.stem).ru}</b>`;
    const hid = hiddenOf(p.branch).map((h) => {
      const hs = STEMS[h.stem];
      return `<span style="--rgb:${rgb(hs.el)}" title="${hs.ru} (${EL[hs.el]}) — ${godOf(a.dm, h.stem).ru}, доля ${Math.round(h.w * 100)}%"><b class="hh">${elIcon(hs.el, EL_COLOR[hs.el], 18)}${hs.ru}</b><small>${godOf(a.dm, h.stem).short}</small><i style="width:${Math.round(h.w * 36)}px"></i></span>`;
    }).join('');
    const [ny] = nayinOf(p.idx);
    const st = a.stars.filter((x) => x.pos.includes(p.pos)).map((x) => `<span class="${x.name === 'Пустота' ? 'void' : ''}">${x.name}</span>`).join('');
    return `<article class="pillar${isDm ? ' dm' : ''}" style="--c1:${EL_COLOR[s.el]};--c2:${EL_COLOR[b.el]}">
      <div class="pl-pos">${POS_RU[p.pos]}</div><div class="pl-sense">${POS_SENSE[p.pos]}</div>
      <div class="god">${g}</div>
      ${stemTile(p.stem)}<div class="gl-name">${s.ru}</div><div class="gl-sub">${EL[s.el]} ${pol(s.yang)} · ${s.image}</div>
      <div class="sep"></div>
      ${branchTile(p.branch)}<div class="gl-name">${b.ru} · ${b.animal}</div><div class="gl-sub">${EL[b.el]} · ${b.hours}</div>
      <div class="hid">${hid}</div>
      <div class="pl-row"><em>Стадия ци</em>${STAGES[stageOf(a.dm, p.branch)]}</div>
      <div class="pl-row"><em>На Инь</em>${ny}</div>
      ${st ? `<div class="badges">${st}</div>` : ''}
    </article>`;
  }).join('');
  const L = c.local, pad = (n: number) => String(n).padStart(2, '0');
  const eot = `${c.eotMin >= 0 ? '+' : '−'}${Math.abs(c.eotMin).toFixed(1)} мин`;
  return `<section class="block" id="s-pillars">
    <div class="bhead"><div><h2>Четыре столпа <span class="tag t">ТОЧНО</span></h2></div>
    <p>Читается справа налево, как в китайской карте: год (корни) → месяц → день (вы) → час (плоды). Верхний знак — небесный ствол, нижний — земная ветвь со спрятанными стволами.</p></div>
    <div class="pillars-wrap"><div class="pillars" style="--n:${c.pillars.length}">${cols}</div><svg class="links" id="links"></svg></div>
    <p class="meta">${esc(c.input.place ?? '')} · ${c.input.date} ${c.input.timeKnown ? c.input.time : '(время неизвестно — без столпа часа)'} · расчётное время ${pad(L.h)}:${pad(L.min)} (${c.variant.solar ? `истинное солнечное, уравнение времени ${eot}` : 'поясное'})</p>
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
  const h = Math.max(110, 34 + I.length * 30);
  svg.setAttribute('height', String(h)); svg.style.height = h + 'px';
  svg.innerHTML = I.map((it, k) => {
    const pts = [it.a, it.b, it.c].filter(Boolean).map((p) => xs[p as Pos]).sort((x, y) => x - y);
    const x1 = pts[0], x2 = pts[pts.length - 1], depth = 24 + k * 28;
    const col = it.tone === 'harm' ? '#ef6a4c' : it.el != null ? EL_COLOR[it.el] : '#c9a85c';
    const d = `M${x1},4 C${x1},${depth} ${x2},${depth} ${x2},4`;
    const len = Math.round(Math.abs(x2 - x1) + depth * 2);
    const mid = pts.length === 3 ? `<circle cx="${pts[1]}" cy="${depth * 0.75}" r="3" fill="${col}"/>` : '';
    return `<g style="--len:${len};--dl:${1.6 + k * 0.25}s"><path d="${d}" stroke="${col}" ${it.tone === 'harm' ? 'stroke-dasharray="6 5"' : ''} style="--len:${len}"/>${mid}
      <text x="${Math.min(Math.max((x1 + x2) / 2, 80), box.width - 80)}" y="${depth * 0.75 + 14}" text-anchor="middle" fill="${col}">${esc(it.label)}${it.stems ? ' (стволы)' : ''}</text></g>`;
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
    s += `<text x="${x}" y="${ly}" text-anchor="middle" font-size="15" font-weight="600" fill="${EL_COLOR[e]}">${EL[e]} ${Math.round(a.pct[e] * 100)}%</text>`;
    const tags = [me ? 'вы' : '', fav ? 'полезна' : '', bad ? 'нагрузка' : ''].filter(Boolean).join(' · ');
    if (tags) s += `<text x="${x}" y="${ly + 17}" text-anchor="middle" font-size="12" fill="rgba(236,230,211,.6)">${tags}</text>`;
    s += '</g>';
  }
  const FX_OF = [0, 3, 4, 7, 8];
  const cvs = live.map((n) => `<canvas class="fxc wfx" data-stem="${FX_OF[n.e]}" style="left:${((n.x - n.r + 40) / 600) * 100}%;top:${((n.y - n.r + 30) / 560) * 100}%;width:${((n.r * 2) / 600) * 100}%"></canvas>`).join('');
  return `<div class="wheel-wrap"><svg class="wheel" viewBox="-40 -30 600 560" role="img" aria-label="Круг пяти стихий">${s}</svg>${cvs}</div>`;
}

function secElements(c: Chart, a: Analysis, charts: { v: Variant; a: Analysis }[]) {
  const bars = [0, 1, 2, 3, 4].map((e) => `<div class="bar" style="--rgb:${rgb(e)}"><div>${EL[e]}<small>${SEASON_STATE[seasonStateOf(e, a.monthEl)]}</small></div><div class="track"><div class="fill" data-w="${Math.round(a.pct[e] * 100)}%"></div></div><div class="v">${Math.round(a.pct[e] * 100)}%</div></div>`).join('');
  const rs = charts.map((x) => x.a.ratio), lo = Math.min(...rs), hi = Math.max(...rs);
  const chip = (e: El) => `<span class="chip" style="--rgb:${rgb(e)}">${elIcon(e, EL_COLOR[e], 18)}${EL[e]}</span>`;
  const methods = a.useful.map((u) => `<div><b>${u.method}:</b> ${u.why}. Полезно — ${u.fav.map((e) => EL[e]).join(', ')}.</div>`).join('');
  void c;
  return `<section class="block"><div class="bhead"><div><h2>Пять стихий <span class="tag d">ТРАДИЦИЯ</span></h2></div>
    <p>Стволы весят 1, ветви — по долям спрятанных стволов, ветвь месяца ×2 (сезон). Стрелки по кругу — порождение, пунктир внутри — подавление.</p></div>
    <div class="grid2"><div class="card pane">${wheel(a)}</div>
    <div class="card pane"><div class="bars">${bars}</div>
      <div class="gauge"><h3>Сила Господина дня: ${a.strength}</h3>
        <div class="scale"><div class="rng" style="left:${lo * 100}%;width:${Math.max(1, (hi - lo) * 100)}%"></div><div class="mk" style="left:${a.ratio * 100}%"></div></div>
        <div class="lbl"><span>слабый</span><span>баланс</span><span>сильный</span></div>
        <p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">Опора ${Math.round(a.ratio * 100)}% · в сезон рождения ${STEMS[a.dm].ru} ${SEASON_STATE[a.season].toLowerCase()}. Рамка — разброс по всем школам (${Math.round(lo * 100)}–${Math.round(hi * 100)}%).</p></div>
      <h3 style="margin-top:22px">Полезные стихии</h3><div class="chips">${a.consensus.map(chip).join('')}</div>
      ${a.avoid.length ? `<p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">Нагрузка: ${a.avoid.map((e) => EL[e]).join(', ')}</p>` : ''}
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
  s += `<text x="${cx}" y="${cy + 44}" text-anchor="middle" font-size="13" fill="#e2c47c">Солнце ${c.sunLon.toFixed(2)}°</text>`;
  const L = c.local, pad = (n: number) => String(n).padStart(2, '0');
  return `<section class="block"><div class="bhead"><div><h2>Сезон рождения <span class="tag t">ТОЧНО</span></h2></div>
    <p>Китайский год делится на 24 сезона по долготе Солнца. Месяц Бацзы начинается не с 1-го числа, а в момент «цзе» — когда Солнце проходит очередные 30°.</p></div>
    <div class="grid2"><div class="card pane"><svg class="ring" viewBox="0 0 460 460" role="img" aria-label="Кольцо 24 сезонов">${s}</svg></div>
    <div class="card pane"><div class="facts">
      <div><span>Момент рождения (UTC)</span><b>${c.utc.toISOString().slice(0, 16).replace('T', ' ')}</b></div>
      <div><span>Долгота Солнца</span><b>${c.sunLon.toFixed(3)}°</b></div>
      <div><span>Сезон</span><b>${TERMS[c.termIdx]}</b></div>
      <div><span>Уравнение времени</span><b>${c.eotMin >= 0 ? '+' : '−'}${Math.abs(c.eotMin).toFixed(1)} мин</b></div>
      <div><span>Расчётное местное время</span><b>${pad(L.h)}:${pad(L.min)} · ${c.variant.solar ? 'истинное солнечное' : 'поясное'}</b></div>
      <div><span>${c.forward ? 'До следующего' : 'После прошлого'} «цзе»</span><b>${c.jieDays.toFixed(2)} дн → старт удачи ${c.startAge.toFixed(1)} лет</b></div>
      <div><span>Направление тактов</span><b>${c.forward ? 'вперёд' : 'назад'} (год ${pol(STEMS[c.pillars.at(-1)!.stem].yang)}, ${c.input.male ? 'мужчина' : 'женщина'})</b></div>
    </div></div></div></section>`;
}

function secLuck(c: Chart, a: Analysis) {
  const now = new Date(), nowY = now.getFullYear();
  const cur = c.luck.findIndex((l, i) => nowY >= l.year && (i === c.luck.length - 1 || nowY < c.luck[i + 1].year));
  const cards = c.luck.map((l, i) => {
    const r = luckReading(a, l.idx), s = STEMS[l.idx % 10], b = BRANCHES[l.idx % 12];
    return `<button class="lk ${r.tone}${i === cur ? ' now sel' : ''}" data-i="${i}">${thumb(l.idx % 12, 64)}<span class="lk-el">${elIcon(s.el, EL_COLOR[s.el], 16)}<b style="color:${EL_COLOR[s.el]}">${s.ru}</b></span><small>${b.animal}</small><div class="age">${Math.floor(l.age)}–${Math.floor(l.age) + 9} лет</div><small>${l.year}–${l.year + 9}</small></button>`;
  }).join('');
  const yrs = Array.from({ length: 10 }, (_, k) => nowY - 1 + k).map((y) => {
    const i = yearIdx(y), r = luckReading(a, i), s = STEMS[i % 10], b = BRANCHES[i % 12];
    return `<div class="yr ${r.tone}${y === nowY ? ' now' : ''}" title="${esc(r.text + ' ' + luckDetail(c, a, i).join(' '))}">${thumb(i % 12, 40)}<span class="yr-el">${elIcon(s.el, EL_COLOR[s.el], 13)}${EL[s.el]}</span>${y}<br>${b.animal}</div>`;
  }).join('');
  const sel = cur >= 0 ? cur : 0, rd = luckReading(a, c.luck[sel].idx);
  return `<section class="block"><div class="bhead"><div><h2>Такты удачи <span class="tag d">ТРАДИЦИЯ</span></h2></div>
    <p>Десятилетия идут от столпа месяца ${c.forward ? 'вперёд' : 'назад'} по циклу из 60. Зелёная черта — приходит полезная стихия, красная — нагрузка. Нажмите на такт.</p></div>
    <div class="luck">${cards}</div>
    <div class="reading" id="lkr"><b>${c.luck[sel].year}–${c.luck[sel].year + 9}${sel === cur ? ' · сейчас' : ''}.</b> ${esc(rd.text)} ${esc(luckDetail(c, a, c.luck[sel].idx).join(' '))}</div>
    <h3 style="margin-top:26px">Годы</h3><div class="years">${yrs}</div></section>`;
}

const noteHtml = (n: Note) => `<div class="note ${n.tone ?? ''}"><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p>${n.quote || n.src ? `<p class="q">${n.quote ? `「${n.quote}」 ` : ''}${n.src ? `<span class="src">${esc(n.src)}</span>` : ''}</p>` : ''}</div>`;

function secRazbor(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], t = DM_TEXT[a.dm], gp = godProfile(a);
  const inter = a.interactions.map((i) => `<li class="${i.tone === 'harm' ? 'harm' : ''}"><b>${esc(i.label)}</b> — ${POS_RU[i.a]}${i.b ? ' и ' + POS_RU[i.b].toLowerCase() : ''}${i.c ? ' и ' + POS_RU[i.c].toLowerCase() : ''}: ${INTER_SENSE[i.kind]}</li>`).join('');
  const stars = a.stars.map((s) => `<li><b>${s.name}</b> (${s.pos.map((p) => POS_RU[p].toLowerCase()).join(', ')}) — ${s.sense}</li>`).join('');
  const godsList = Object.entries(a.gods).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, w]) => `<li><b>${GODS[k].ru}</b> · ${w.toFixed(1)} — ${GODS[k].sense}</li>`).join('');
  const combos = comboNotes(c, a), bonds = bondNotes(c, a);
  return `<section class="block"><div class="bhead"><div><h2>Разбор <span class="tag d">ТРАДИЦИЯ</span></h2></div><p>Каждый вывод — из фактов вашей карты и правил классики: цитата и источник под ним (ДТС — «Ди тянь суй», ЦПЦЦ — «Цзы пин чжэнь цюань», ЮХ — «Юань хай цзы пин», СМ — «Сань мин тун хуэй»). Где школы спорят — сказано. Это язык самоанализа, а не приговор.</p></div>
    <div class="razbor">
      <div class="card pane"><div class="dm-hero">${stemTile(a.dm)}<div><h3>${t.title}</h3><p><b>${d.ru}</b> — ${EL[d.el]} ${pol(d.yang)}. Сила: ${a.strength}.</p></div></div>
        ${noteHtml(natureNote(a))}${noteHtml(strengthNote(c, a))}
        <div class="note"><h4>В образах <span class="src">ЮХ, условно — ЦПЦЦ гл.1 образы стволов отвергает</span></h4><p><b>Дар:</b> ${t.gift}. <b>Тень:</b> ${t.shadow}. <b>Путь:</b> ${t.way}</p></div></div>
      <div class="card pane"><h3>Ось и климат</h3>${noteHtml(axisNote(c, a))}${noteHtml(climateNote(c, a))}
        <h4 class="sub">Полезный бог (用神) по классике · ${esc(a.brain.frame.name)} ${a.brain.frame.zh}</h4>${a.brain.steps.map((st) => noteHtml({ title: st.title, text: st.text, src: st.src })).join('')}
        <h4 class="sub">Что вас питает: главное — ${EL[a.brain.yong]}</h4>${a.consensus.map((e) => `<p>${EL_NEED[e]}</p>`).join('')}
        ${a.avoid.length ? `<p><b>Меньше:</b> ${a.avoid.map((e) => EL[e]).join(', ')} — в избытке эта стихия давит на карту.</p>` : ''}</div>
      <div class="card pane"><h3>10 божеств: профиль · ${gp.top.join(' · ')}</h3><p>${gp.text}</p><ul class="list">${godsList}</ul>
        ${godNatureNotes(a).map(noteHtml).join('')}
        <h4 class="sub">Классические формулы в стволах</h4>${combos.length ? combos.map(noteHtml).join('') : '<p>Ни одна из классических формул (官印相生, 食神制杀, 伤官见官…) в стволах не сложилась — карта читается по оси и силе.</p>'}</div>
      <div class="card pane"><h3>Связи в карте</h3><ul class="list">${inter || '<li>Столкновений и союзов нет — карта спокойная.</li>'}</ul>
        ${bonds.map(noteHtml).join('')}
        <p class="q"><span class="src">刑/害 показываются, но веса не имеют — «刑害不足論» (Жэнь); снятие: союз снимает удар (ЦПЦЦ гл.7)</span></p>
        ${stars ? `<h3 style="margin-top:18px">Звёзды-символы</h3><ul class="list">${stars}</ul>` : ''}</div>
    </div></section>`;
}

const INTER_SENSE: Record<string, string> = {
  clash: 'разрыв и движение: переезды, смена работы или отношений в сферах этих столпов',
  six: 'тайный союз и притяжение — поддержка, которая приходит через людей',
  harm: 'скрытые трения и недопонимание',
  punish: 'испытание через ошибки и суд — урок, который повторяется, пока не усвоен',
  scombo: 'стволы тянутся друг к другу — союз целей, иногда размывающий собственную стихию',
  sclash: 'прямой конфликт намерений',
  trine: 'сильнейший союз — стихия становится главной темой жизни',
  half: 'полусоюз — стихия усиливается, ждёт третий знак в такте или году',
  dir: 'сезонный союз — вся сторона света в карте, стихия доминирует',
};

function secSchools(charts: { v: Variant; c: Chart; a: Analysis }[], active: Variant) {
  const base = charts.find((x) => sameV(x.v, DEFAULT_VARIANT)) ?? charts[0];
  const rows = charts.map((x, i) => {
    const cells = x.c.pillars.map((p, j) => `<td class="p${p.idx !== base.c.pillars[j]?.idx ? ' diff' : ''}">${pillarRuHtml(p.idx)}</td>`).join('');
    return `<tr class="${sameV(x.v, active) ? 'act' : ''}"><td>${variantLabel(x.v)}</td>${cells}<td>${x.a.strength}</td><td>${x.a.consensus.map((e) => EL[e]).join(', ')}</td><td>${sameV(x.v, active) ? '●' : `<button data-v="${i}">выбрать</button>`}</td></tr>`;
  }).join('');
  const n = charts.length;
  const samePillars = charts.every((x) => x.c.pillars.every((p, j) => p.idx === base.c.pillars[j].idx));
  const sameDm = charts.every((x) => x.a.dm === base.a.dm);
  const top = base.a.consensus[0], topN = charts.filter((x) => x.a.consensus[0] === top).length;
  const sameStr = charts.every((x) => x.a.strengthKey === base.a.strengthKey);
  const card = (ok: boolean, t: string, s: string) => `<div class="${ok ? 'ok' : 'warn'}"><b>${t}</b>${s}</div>`;
  const heads = base.c.pillars.map((p) => `<th>${POS_RU[p.pos]}</th>`).join('');
  return `<section class="block"><div class="bhead"><div><h2>Разночтения школ <span class="tag n">НАУКА</span></h2></div>
    <p>Мы считаем карту во всех вариантах сразу. Что совпадает везде — надёжно. Где школы расходятся — видно честно, без выбора «правды» за вас.</p></div>
    <div class="stab">
      ${card(samePillars, samePillars ? 'Все столпы одинаковы' : 'Столпы расходятся', ` в ${n} вариантах`)}
      ${card(sameDm, sameDm ? 'Господин дня устойчив' : 'Господин дня зависит от школы', sameDm ? ` — ${STEMS[base.a.dm].ru} во всех ${n}` : ' — рождение около полуночи')}
      ${card(sameStr, sameStr ? `Сила: ${base.a.strength}` : 'Сила на границе', sameStr ? ' — во всех вариантах' : ' — трактовки расходятся')}
      ${card(topN === n, `Полезная: ${EL[top]}`, ` — в ${topN} из ${n}`)}
    </div>
    <div class="card pane vt-wrap"><table class="vt"><thead><tr><th>Школа</th>${heads}<th>Сила</th><th>Полезно</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
const sameV = (a: Variant, b: Variant) => a.zi === b.zi && a.solar === b.solar && a.south === b.south;

// ——— Мои дни: календарь по карте ———
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const dLabel = (d: DayInfo, wd = true) => { const [y, m, dd] = d.iso.split('-').map(Number); const w = new Date(y, m - 1, dd).getDay(); return `${dd} ${MON[m - 1]}${wd ? ', ' + WD[w] : ''}`; };
const dayCell = (d: DayInfo, today: boolean) => { const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12], dd = +d.iso.slice(8);
  return `<button class="dc ${d.type}${today ? ' now' : ''}" data-iso="${d.iso}" title="${esc(DAY_TYPE[d.type].ru + ' · ' + d.god.short)}"><b>${dd}</b><span style="color:${EL_COLOR[s.el]}">${elIcon(s.el, EL_COLOR[s.el], 11)}</span><img src="${animalSrc(d.idx % 12)}" alt="${b.animal}" loading="lazy" /></button>`; };
function dayCard(d: DayInfo, big = false) {
  const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12], m = BRANCHES[d.monthIdx % 12], ms = STEMS[d.monthIdx % 10];
  return `<div class="dcard ${d.type}${big ? ' big' : ''}">${thumb(d.idx % 12, big ? 64 : 44)}<div>
    <p class="eyebrow">${dLabel(d)} · ${DAY_TYPE[d.type].ru}</p>
    <h3><span style="color:${EL_COLOR[s.el]}">${s.ru}</span> · ${b.animal} — «${d.god.ru}»</h3>
    <p><b>Что делать:</b> ${d.act}.</p>
    <p class="dhint">${DAY_TYPE[d.type].hint[0].toUpperCase() + DAY_TYPE[d.type].hint.slice(1)}.</p>
    ${d.notes.length ? `<p class="dnote">Осторожно: ${d.notes.map(esc).join('; ')}.</p>` : ''}
    ${big ? `<p class="dhint">Месяц: ${EL[ms.el]} · ${m.animal} (${EL[m.el]}).</p>` : ''}
  </div></div>`;
}
function secDays(c: Chart, a: Analysis) {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = daysFrom(c, a, start, 120), today = days[0];
  const best = days.slice(0, 45).filter((d) => d.type === 'peak').slice(0, 8);
  const pairs = showThenClose(days).slice(0, 5);
  const off = (start.getDay() + 6) % 7, grid = days.slice(0, 56);
  const cells = Array.from({ length: off }, () => '<i></i>').join('') + grid.map((d, k) => dayCell(d, k === 0)).join('');
  const fav = a.consensus.map((e) => EL[e]).join(' и '), bad = a.avoid.map((e) => EL[e]).join(' и ');
  return `<section class="block" id="s-days"><div class="bhead"><div><h2>Мои дни <span class="tag d">ТРАДИЦИЯ</span></h2></div>
    <p>Каждый день — свой знак из цикла 60. Сильный день — когда приходит полезная вам стихия (${fav})${bad ? `, нагрузка — когда ${bad}` : ''}. «Божество дня» подсказывает, какое дело на него ставить. Нажмите на день.</p></div>
    <div class="card pane"><p class="eyebrow">Сегодня</p><div id="dsel">${dayCard(today, true)}</div></div>
    <h3 style="margin-top:26px">8 недель</h3>
    <div class="dlegend"><span class="peak">сильный</span><span class="peak-hit">сильный с ударом</span><span class="calm">ровный</span><span class="heavy">нагрузка</span></div>
    <div class="dgrid"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span>${cells}</div>
    <h3 style="margin-top:26px">Лучшие дни ближайших 45</h3><div class="dlist">${best.map((d) => dayCard(d)).join('') || '<p>Чистых сильных дней нет — ставьте важное на ровные дни.</p>'}</div>
    ${pairs.length ? `<h3 style="margin-top:26px">Связка «покажи → закрой»</h3><p class="dhint">День выражения (показать работу, продать), за ним день денег (закрыть сделку, выставить счёт): ${pairs.map(([x, y]) => `<b>${dLabel(x, false)} → ${dLabel(y, false)}</b>`).join(' · ')}.</p>` : ''}
    <div class="acts" style="margin-top:20px"><button class="ghost" id="saveme" type="button">${localStorage.getItem(ME_KEY) ? 'Обновить «Мою карту»' : 'Сохранить как мою карту'}</button><span class="dhint" id="savemsg"></span></div>
  </section>`;
}
function wireDays(c: Chart, a: Analysis) {
  const sel = document.getElementById('dsel'); if (!sel) return;
  const now = new Date(), days = daysFrom(c, a, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 56);
  document.querySelectorAll<HTMLButtonElement>('.dc').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.dc.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const d = days.find((x) => x.iso === b.dataset.iso); if (d) sel.innerHTML = dayCard(d, true);
    sel.closest('.pane')!.querySelector('.eyebrow')!.textContent = b.classList.contains('now') ? 'Сегодня' : 'Выбранный день';
  }));
  const sv = document.getElementById('saveme');
  if (sv) sv.onclick = () => { localStorage.setItem(ME_KEY, lastQuery || location.search.slice(1)); document.getElementById('savemsg')!.textContent = 'Сохранено в этом браузере. Ссылка «Моя карта» вверху откроет её сразу.'; sv.textContent = 'Обновить «Мою карту»'; document.getElementById('melink')?.removeAttribute('hidden'); };
}

function secAsk() {
  return `<section class="block"><div class="bhead"><div><h2>Спросить карту</h2></div><p>Ответ строится только из вашего разбора выше — без выдуманных чисел.</p></div>
    <div class="card pane"><form class="askf" id="askf"><input id="askq" placeholder="Например: какая профессия мне подходит?" /><button class="go" type="submit">Спросить</button></form><div class="ans" id="ans"></div></div></section>`;
}
function secHonest() {
  return `<section class="block"><div class="card pane honest"><h3>Честно о Бацзы <span class="tag n">НАУКА</span></h3>
    <p>Календарная часть — точная астрономия: моменты сезонов по долготе Солнца (astronomy-engine), истинное солнечное время по долготе места и уравнению времени, 60-ричный цикл дней без пропусков с древности.</p>
    <p>Толкования — традиция двух тысяч лет. Контролируемых исследований, которые подтверждали бы связь момента рождения с судьбой, нет; проверки «временных близнецов» и слепые тесты астрологии эффекта не находят. Используйте карту как язык самоанализа и планирования циклами — и проверяйте её на своей жизни, записывая прогнозы заранее.</p></div></section>`;
}

function wire(c: Chart, a: Analysis, charts: { v: Variant; c: Chart; a: Analysis }[]) {
  const lkr = document.getElementById('lkr')!;
  document.querySelectorAll<HTMLButtonElement>('.lk').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.lk.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    const l = c.luck[+b.dataset.i!], r = luckReading(a, l.idx);
    lkr.innerHTML = `<b>${l.year}–${l.year + 9} · ${Math.floor(l.age)}–${Math.floor(l.age) + 9} лет.</b> ${esc(r.text)} ${esc(luckDetail(c, a, l.idx).join(' '))}`;
  }));
  document.querySelectorAll<HTMLButtonElement>('.vt button[data-v]').forEach((b) => (b.onclick = () => {
    sessionStorage.setItem('bazi-scrolled', '1');
    build(current!.input, charts[+b.dataset.v!].v);
    document.querySelector('.vt')?.scrollIntoView({ block: 'center' });
    sessionStorage.removeItem('bazi-scrolled');
  }));
  const notes = [natureNote(a), strengthNote(c, a), axisNote(c, a), climateNote(c, a), ...comboNotes(c, a), ...bondNotes(c, a)];
  const ctx = chartSummary(c, a) + '\n' + a.consensus.map((e) => EL_NEED[e]).join('\n') + '\n' + notes.map((n) => `${n.title}: ${n.text}${n.src ? ` (${n.src})` : ''}`).join('\n');
  document.getElementById('askf')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (document.getElementById('askq') as HTMLInputElement).value.trim(), ans = document.getElementById('ans')!;
    if (!q) return;
    ans.textContent = 'Думаю над картой…';
    const r = await ask(`${q}\n(Отвечай как знаток Бацзы, опираясь на разбор карты.)`, [], ctx);
    ans.textContent = r.text;
  });
  let rt = 0;
  onresize = () => { clearTimeout(rt); rt = window.setTimeout(() => drawLinks(c, a, false), 150); };
}

// ——— Старт: из адреса ———
(() => {
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
