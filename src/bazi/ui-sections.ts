// Блоки разбора: чистая отрисовка HTML по карте (вынесено из ui.ts 17.10). Состояние и события — в ui.ts.
import { confidence } from './confidence';
import { evTag, evSummary } from './evidence';
import { STEMS, BRANCHES, EL, EL_COLOR, GODS, godOf, senseFor, yearsRu, hiddenOf, stageOf, STAGES, nayinOf, TERMS, SEASON_STATE, type El } from './core';
import { POS_RU, POS_SENSE, yearIdx, type Chart, type Analysis, type Variant, type Pos } from './calc';
import { luckIndexAt, luckYears } from './calc';
import { elIcon } from './fx';
import { DM_TEXT, EL_NEED, godProfile } from './interp';
import { rasklad, raskladNote, bookBasis } from './rasklad';
import { natureNote, strengthNote, axisNote, climateNote, comboNotes, bondNotes, godNatureNotes, luckDetail, portrait, portraitMore, type Note } from './reading';
import { spheres } from './spheres';
import { yearForecast, decade, baziYear, toneRu } from './forecast';
import { daysFrom, prepOnly } from './days';
import { lifeLine, lifeLineSvg } from './lifeline';
import { AMOUNT, esc, rgb, pol, animalSrc, animalSm, lay, animalOf, luckR, thumb } from './ui-kit';
import { dLabel, dayRu } from './ui-days';
function stemTile(stem: number) {
  return `<div class="glyph fx" style="--rgb:${rgb(STEMS[stem].el)}"><canvas class="fxc" data-stem="${stem}" aria-label="${STEMS[stem].ru}: ${STEMS[stem].image}"></canvas></div>`;
}
function branchTile(b: number) {
  return `<div class="glyph ani" style="--rgb:${rgb(BRANCHES[b].el)}"><img src="${animalSrc(b)}" alt="${BRANCHES[b].animal}" loading="lazy" decoding="async" /></div>`;
}

/** «Расклад по 7 вопросам» (rasklad.ts): ответы из расчёта + на чём держится каждый. */
export function secRasklad(c: Chart, a: Analysis) {
  const seen = new Set(portrait(c, a)); // то, что уже сказано в «Кто вы», не повторяем
  const items = rasklad(c, a).map((x, i) => `<div class="card pane rk"><p class="rk-q"><span>${i + 1}</span>${esc(x.q)}</p>${x.a.filter((l) => !seen.has(l)).map((l) => `<p>${esc(l)}</p>`).join('')}</div>`).join('');
  return `<section class="block" id="s-rasklad"><div class="bhead"><div><h2>Расклад по 7 вопросам</h2></div>${evTag('spheres', 'Ответ про занятия проверяли на биографиях — связи с профессией не нашли.')}
    <p>То, что разбирают на консультации, — посчитано по вашей карте.</p></div>
    <div class="rk-grid">${items}</div></section>`;
}

export function secTrait(c: Chart, a: Analysis) {
  const shown = new Set([...portrait(c, a), ...rasklad(c, a).flatMap((x) => x.a)]);
  const ls = portraitMore(c, a).filter((l) => !shown.has(l));
  if (!ls.length) return '';
  return `<section class="block"><div class="bhead"><div><h2>Характер по традиции</h2></div>${evTag('character')}
    <p>Так эти черты описывают старые толкования. Проверку на известных людях они не прошли — читайте как повод задуматься, а не как факт о вас.</p></div>
    <div class="card pane">${ls.map((l) => `<p>${esc(l)}</p>`).join('')}</div></section>`;
}

export function secWho(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], day = c.pillars.find((p) => p.pos === 'day')!, br = BRANCHES[day.branch], t = DM_TEXT[a.dm];
  const yr = c.pillars.find((p) => p.pos === 'year')!;
  const ci = luckIndexAt(c, Date.now()), cur = ci >= 0 ? c.luck[ci] : undefined;
  const lr = cur ? luckR(c, a, cur.idx) : null, tone = lr ? lr.tone : 'mixed', t4 = lr ? lr.t4 : 'mixed';
  return `<section class="block who" style="--rgb:${rgb(d.el)}">
    <div class="who-fx"><canvas class="fxc" data-stem="${a.dm}"></canvas></div>
    <div class="who-txt"><p class="eyebrow">Кто вы</p>
      <h2>${t.title}</h2>
      <p class="who-sub">Ваша стихия — ${EL[d.el].toLowerCase()} · главная опора — ${EL[a.brain.yong].toLowerCase()}${a.brain.xi.length ? `, помогают также ${a.brain.xi.map((e) => EL[e].toLowerCase()).join(', ').replace(/, (?=[^,]*$)/, ' и ')}` : ''}</p>
      ${portrait(c, a).map((l) => `<p>${esc(l)}</p>`).join('')}
      ${a.brain.alt ? `<p>Ваша карта в равновесии, поэтому в разные периоды полезно разное: обычно — ${EL[a.brain.yong].toLowerCase()}, а в годы, когда ${a.brain.alt.lean === 'strong' ? 'приходит поддержка' : 'растёт нагрузка'}, — ${EL[a.brain.alt.yong].toLowerCase()}. Прогноз и календарь дней это учитывают.</p>` : ''}
      <div class="who-row">
        <div><img src="${animalSm(day.branch)}" alt="" /><span>Животное дня<b>${br.animal}</b></span></div>
        <div><img src="${animalSm(yr.branch)}" alt="" /><span>Животное года<b>${BRANCHES[yr.branch].animal}</b></span></div>
        ${cur ? `<div class="lt ${tone}"><img src="${animalSm(cur.idx % 12)}" alt="" /><span>Десятилетие сейчас<b>${luckYears(c, ci)} · ${t4 === 'good' ? 'благоприятно' : t4 === 'bad' ? 'нагрузка' : t4 === 'calm' ? 'спокойно' : 'смешанно'}</b></span></div>` : ''}
      </div>${todayLine(c, a)}</div></section>`;
}
/** Аудит 16.10: ради дней сюда и приходят, а «сегодня» было спрятано в свёрнутом разделе. Одна строка — оценка, тема дня, ссылка к дням. */
function todayLine(c: Chart, a: Analysis) {
  const n = new Date(), d = daysFrom(c, a, new Date(n.getFullYear(), n.getMonth(), n.getDate()), 1)[0];
  const tone = d.type === 'peak' ? 'good' : d.type === 'heavy' ? 'bad' : 'mixed';
  return `<a class="who-today ${tone}" href="#s-days" id="go-days"><span class="wt-h">Сегодня, ${dLabel(d)} · ${dayRu(d).toLowerCase()}, ${d.score} из 5</span><span class="wt-t">${prepOnly(d) ? 'День готовить и обдумывать, а не решать' : esc(lay(d.act)).replace(/^./, (x) => x.toUpperCase())}. Все дни и лучшие часы →</span></a>`;
}

export function secPillars(c: Chart, a: Analysis) {
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
    <div class="bhead"><div><h2>Четыре столпа</h2></div>${evTag('calc')}
    <p>Читается справа налево, как в китайской карте: год (корни) → месяц → день (вы) → час (плоды). Верхний знак — небесный ствол, нижний — земная ветвь со спрятанными стволами.</p></div>
    <div class="pillars-wrap"><div class="pillars" style="--n:${c.pillars.length}">${cols}</div><svg class="links" id="links"></svg></div>
    <p class="meta">${esc(c.input.place ?? '')} · ${esc(c.input.date.split('-').reverse().join('.'))} ${c.input.timeKnown ? esc(c.input.time) : '(время неизвестно — без столпа часа)'} · по солнцу в месте рождения ${pad(L.h)}:${pad(L.min)}</p>
  </section>`;
}

export function drawLinks(c: Chart, a: Analysis, anim = true) {
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

/** applied — полезные стихии подобраны по прошлым годам человека («Сверка с вашей жизнью»). */
export function secElements(c: Chart, a: Analysis, charts: { v: Variant; a: Analysis }[], applied = false) {
  const bars = [0, 1, 2, 3, 4].map((e) => `<div class="bar" style="--rgb:${rgb(e)}"><div>${EL[e]}<small>${SEASON_STATE[seasonStateOf(e, a.monthEl)]}</small></div><div class="track"><div class="fill" data-w="${Math.round(a.pct[e] * 100)}%"></div></div><div class="v">${AMOUNT(a.pct[e])}</div></div>`).join('');
  const gpos = (x: Analysis) => Math.min(0.97, Math.max(0.03, ((x.brain?.power.score ?? (x.ratio - 0.5) * 20) + 9) / 18));
  const rs = charts.map((x) => gpos(x.a)), lo = Math.min(...rs), hi = Math.max(...rs);
  const chip = (e: El) => `<span class="chip" style="--rgb:${rgb(e)}">${elIcon(e, EL_COLOR[e], 18)}${EL[e]}</span>`;
  void c;
  return `<section class="block"><div class="bhead"><div><h2>Пять стихий</h2></div>${evTag('yong', yongExtra(a))}
    <p>Сколько каждой стихии в вашей карте. Стрелки по кругу показывают, какая стихия питает следующую, пунктир внутри — какая сдерживает.</p></div>
    <div class="grid2"><div class="card pane">${wheel(a)}</div>
    <div class="card pane"><div class="bars">${bars}</div>
      <div class="gauge"><h3>Тип по силе: ${a.strength}</h3>
        <div class="scale"><div class="rng" style="left:${lo * 100}%;width:${Math.max(1, (hi - lo) * 100)}%"></div><div class="mk" style="left:${gpos(a) * 100}%"></div></div>
        <div class="lbl"><span>слабый</span><span>баланс</span><span>сильный</span></div>
        <p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">В сезон рождения ${STEMS[a.dm].ru} ${SEASON_STATE[a.season].toLowerCase()}.</p></div>
      <h3 style="margin-top:22px">Полезные стихии</h3><div class="chips">${a.consensus.map(chip).join('')}</div>
      ${a.avoid.length ? `<p style="font-size:14px;color:var(--ink-3);margin:10px 0 0">Нагрузка: ${a.avoid.map((e) => EL[e]).join(', ')}</p>` : ''}
      ${((k) => `<p class="conf ${k.dispute ? 'low' : 'mid'}"><b>На чём держится вывод: ${k.dispute ? 'классика, есть спорное место' : 'классика, школы согласны'}.</b> ${esc(raskladNote(a))}${applied ? ' Полезные стихии здесь подобраны по вашим прошлым годам — проверено на вашей жизни, но на небольшом числе событий.' : a.brain.rival ? '' : ' Уточнить под себя — блок «Сверка с вашей жизнью» ниже.'}</p>${a.brain.rival ? `<p class="conf low">На практике мастера здесь расходились: при такой силе карты часть из них шла обратным путём — главной опорой брали ${EL[a.brain.rival.yong].toLowerCase()}. В разборах старых мастеров при такой силе обратный путь выбирали примерно в 2 случаях из 10, путь выше — в 4 из 10. Какой путь ваш, покажет <a href="#s-past" class="go-past">«Сверка с вашей жизнью»</a>: отметьте 5–10 ярких лет.</p>` : ''}`)(bookBasis(a))}
    </div></div></section>`;
}
function seasonStateOf(e: number, m: number) { return e === m ? 0 : (m + 1) % 5 === e ? 1 : (e + 1) % 5 === m ? 2 : (e + 2) % 5 === m ? 3 : 4; }

export function secSeason(c: Chart) {
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
    if (jie) { const [tx, ty] = pos(lon + 15, R - 40); const b = (2 + k / 2) % 12; s += `<image href="${animalSm(b)}" x="${tx - 19}" y="${ty - 19}" width="38" height="38"/>`; }
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
      <div><span>Такты удачи начинаются</span><b>примерно с ${Math.max(1, Math.round(c.startAge))} ${Math.max(1, Math.round(c.startAge)) % 10 === 1 && Math.max(1, Math.round(c.startAge)) % 100 !== 11 ? 'года' : 'лет'}</b></div>
    </div></div></div></section>`;
}

const MON_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** «Смена: 7 июля 2022 → 7 июля 2032» по точному моменту (местное время браузера). */
export function luckWhen(c: Chart, i: number) {
  const f = (t?: number) => { if (t == null) return ''; const d = new Date(t); return `${d.getDate()} ${MON_G[d.getMonth()]} ${d.getFullYear()}`; };
  const a = f(c.luck[i].start), b = f(c.luck[i + 1]?.start);
  return a ? ` <span class="lk-when">С ${a}${b ? ` по ${b}` : ''}.</span>` : '';
}

export function secLuck(c: Chart, a: Analysis) {
  const now = new Date(), nowY = now.getFullYear();
  const cur = luckIndexAt(c, now.getTime());
  const cards = c.luck.map((l, i) => {
    const r = luckR(c, a, l.idx), s = STEMS[l.idx % 10], b = BRANCHES[l.idx % 12];
    return `<button class="lk ${r.tone}${i === cur ? ' now sel' : ''}" data-i="${i}">${thumb(l.idx % 12, 64)}<span class="lk-el">${elIcon(s.el, EL_COLOR[s.el], 16)}<b style="color:${EL_COLOR[s.el]}">${s.ru}</b></span><small>${b.animal}</small><div class="age">${Math.floor(l.age)}–${Math.floor(l.age) + 10} ${yearsRu(Math.floor(l.age) + 10)}</div><small>${luckYears(c, i)}</small></button>`;
  }).join('');
  const yrs = Array.from({ length: 10 }, (_, k) => nowY - 1 + k).map((y) => {
    const i = yearIdx(y), r = luckR(c, a, i), s = STEMS[i % 10], b = BRANCHES[i % 12];
    return `<div class="yr ${r.tone}${y === nowY ? ' now' : ''}" title="${esc(r.text + ' ' + luckDetail(c, a, i).join(' '))}">${thumb(i % 12, 40)}<span class="yr-el">${elIcon(s.el, EL_COLOR[s.el], 13)}${EL[s.el]}</span>${y}<br>${b.animal}</div>`;
  }).join('');
  const sel = cur >= 0 ? cur : 0, rd = luckR(c, a, c.luck[sel].idx);
  return `<section class="block"><div class="bhead"><div><h2>Такты удачи</h2></div>${evTag('periods', '', 'Та же проверка, что у годов: на биографиях известных людей — на уровне монетки.')}
    <p>Каждые 10 лет меняется фон жизни — это такты удачи. Зелёная черта — приходит полезная стихия, красная — нагрузка. Нажмите на такт.</p></div>
    <div class="ll-box"><h3>Линия жизни</h3><p class="dhint">Как старая традиция видит фон ваших лет: выше середины — легче, ниже — нагрузка. На биографиях известных людей эта линия важные годы не угадала — это картинка традиции, не прогноз.</p>${lifeLineSvg(lifeLine(c, a), nowY)}</div>
    <div class="luck">${cards}</div>
    <div class="reading" id="lkr"><b>${luckYears(c, sel)}${sel === cur ? ' · сейчас' : ''}.</b>${luckWhen(c, sel)} ${esc(rd.text)} ${esc(luckDetail(c, a, c.luck[sel].idx).join(' '))}</div>
    <h3 style="margin-top:26px">Годы</h3><div class="years">${yrs}</div></section>`;
}

export const noteHtml = (n: Note) => `<div class="note ${n.tone ?? ''}"><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p></div>`;

const ucFirst = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const lcFirst = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
const hitsTxt = (h: string[]) => (h.length ? ' Осторожно: ' + esc(lay(h.join('; '))) + '.' : '');

/** Почему у месяца такой итог: всё после первой фразы (перевес, связь с картой), простыми словами. */
const monthWhy = (t: string) => { const r = lay(t.split('. ').slice(1).join('. ')); return r ? `<p class="fm-r">${esc(ucFirst(r))}.</p>` : ''; };

export function secForecast(c: Chart, a: Analysis) {
  const Y = baziYear(), y = yearForecast(c, a, Y), dec = decade(c, a, Y);
  const dt = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const pill = animalOf;
  const cur = Math.max(0, y.months.findIndex((_, i) => (y.months[i + 1]?.start ?? y.end) > new Date()));
  const mHtml = y.months.map((m, i) => `<div class="fm ${m.tone}"><p class="fm-d">${dt(m.start)} — ${dt(new Date((y.months[i + 1]?.start ?? y.end).getTime() - 864e5))}</p>
    <b>${pill(m.idx)}</b> <span class="fm-t">${toneRu(m.tone)}</span><p class="fm-w">${esc(lay(m.why))}${m.swing ? ` (${esc(m.swing)})` : ''}</p>${monthWhy(m.text)}<p>${esc(lay(m.act))}</p>${m.hits.filter((h) => !lay(m.text).toLowerCase().includes(lay(h).toLowerCase())).map((h) => `<p class="fm-h">${esc(lay(h))}</p>`).join('')}</div>`);
  const rest = mHtml.filter((_, i) => i < cur || i > cur + 2);
  const months = `<div class="fm-grid">${mHtml.slice(cur, cur + 3).join('')}</div>${rest.length ? `<details class="more-in"><summary>Все месяцы года</summary><div class="fm-grid">${rest.join('')}</div></details>` : ''}`;
  // Удары (hits) и подробности такта (luckDetail) частично совпадают — повтор убираем, предложения — с заглавной.
  const yHtml = dec.map((d) => {
    const low = d.text.toLowerCase(), hits = d.hits.filter((h) => !low.includes(h.toLowerCase()));
    const det = d.detail.filter((x) => !d.hits.some((h) => x.toLowerCase().includes(h)) && !(/встряска/i.test(x) && /встряска|удар по столпу/.test(low)));
    const detTxt = lay(det.join(' '));
    return `<li class="fy ${d.tone}"><b>${d.year}</b> <span>${pill(d.idx)}</span> <span class="fm-t">${toneRu(d.tone)}</span>: ${esc(lcFirst(d.why))}; ${esc(lay(d.text))}.
    <details><summary>Подробнее</summary><small>Чем заняться: ${esc(lay(d.act))}.${hitsTxt(hits)}${detTxt ? ` ${esc(detTxt)}.` : ''}</small></details></li>`;
  });
  const years = `<ul class="list fy-list">${yHtml.slice(0, 3).join('')}</ul><details class="more-in"><summary>Остальные ${yHtml.length - 3} лет</summary><ul class="list fy-list">${yHtml.slice(3).join('')}</ul></details>`;
  return `<section class="block"><div class="bhead"><div><h2>Ваш год и десятилетие</h2></div>${evTag('periods')}<p>Год по китайскому календарю начинается около 4 февраля. Для каждого месяца и года — насколько он вам благоприятен и чем лучше заняться.</p></div>
    <div class="card pane"><h3>${Y} · ${pill(y.idx)} — ${toneRu(y.tone)}</h3><p>${esc(lay(y.text[0].toUpperCase() + y.text.slice(1)))}. Главное дело года: ${esc(lay(y.act))}.${hitsTxt(y.hits)}${y.luck ? ` Десятилетие с ${y.luck.from} года — ${toneRu(y.luck.tone)}: оно задаёт общий фон, год — погода внутри него.` : ''}</p>
      ${months}</div>
    <div class="card pane" style="margin-top:22px"><h3>Десять лет по годам</h3>${years}</div></section>`;
}

export function secSpheres(c: Chart, a: Analysis) {
  const cards = spheres(c, a).map((x) => `<div class="card pane sph"><h3>${esc(x.title)}</h3><p class="lead">${esc(x.lead)}</p>
    <ul class="list">${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="todo"><b>Что делать.</b> ${esc(x.todo)}</p></div>`).join('');
  return `<section class="block"><div class="bhead"><div><h2>Ваша жизнь по сферам</h2></div>${evTag('spheres')}<p>Характер, дело, деньги, любовь, здоровье и родные — простыми словами из вашей карты.</p></div>
    <div class="sph-grid">${cards}</div></section>`;
}

export function pushCta() {
  return `<section class="block push-cta"><div class="card pane"><p class="eyebrow">Каждое утро</p><h3>Ваш день — в 8:00 на телефон</h3>
    <p class="dhint">Сильный день или нагрузка, что делать, лучшие часы. Для этого данные рождения хранятся у нас; отключить — той же кнопкой.</p>
    <button class="go" data-push type="button">Мой день — каждое утро</button><p class="dhint" data-pushmsg></p>
    <div class="acts"><button class="ghost" id="scard" type="button">Картинка для Stories</button><button class="ghost" id="share" type="button">Поделиться разбором</button><button class="ghost" id="pdf" type="button">Сохранить в PDF</button></div></div></section>`;
}
export function secRazbor(c: Chart, a: Analysis) {
  const d = STEMS[a.dm], t = DM_TEXT[a.dm], gp = godProfile(a);
  const inter = a.interactions.map((i) => `<li class="${i.tone === 'harm' ? 'harm' : ''}"><b>${esc(i.label)}</b> — ${POS_RU[i.a]}${i.b ? ' и ' + POS_RU[i.b].toLowerCase() : ''}${i.c ? ' и ' + POS_RU[i.c].toLowerCase() : ''}: ${INTER_SENSE[i.kind]}</li>`).join('');
  const godsList = Object.entries(a.gods).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => `<li><b>${GODS[k].ru}</b> — ${senseFor(k, c.input.male)}</li>`).join('');
  const combos = comboNotes(c, a), bonds = bondNotes(c, a);
  return `<section class="block"><details class="more"><summary><h2>Подробный разбор карты</h2><p>Из чего сложена карта и почему выводы такие — для тех, кому интересно глубже.</p></summary>
    <div class="razbor">
      <div class="card pane"><div class="dm-hero">${stemTile(a.dm)}<div><h3>${t.title}</h3><p><b>${d.ru}</b> — ${EL[d.el]} ${pol(d.yang)}. Тип по силе: ${a.strength}.</p></div></div>
        ${noteHtml(natureNote(a))}${noteHtml(strengthNote(c, a))}
        <div class="note"><h4>В образах</h4><p><b>Дар:</b> ${t.gift}. <b>Тень:</b> ${t.shadow}. <b>Путь:</b> ${t.way}</p></div></div>
      <div class="card pane"><h3>Ось и климат</h3><p class="conf mid judge" id="judge" hidden></p>${noteHtml(axisNote(c, a))}${noteHtml(climateNote(c, a))}
        <h4 class="sub">Как выбран полезный бог (структура: ${esc(a.brain.frame.name.toLowerCase())})</h4>${a.brain.steps.map((st) => noteHtml({ title: st.title, text: st.text })).join('')}
        <h4 class="sub">Что вас питает: главное — ${EL[a.brain.yong]}</h4>${a.consensus.map((e) => `<p>${EL_NEED[e]}</p>`).join('')}
        ${a.avoid.length ? `<p><b>Меньше:</b> ${a.avoid.map((e) => EL[e]).join(', ')} — в избытке эта стихия давит на карту.</p>` : ''}</div>
      <div class="card pane"><h3>10 божеств: ${gp.top.map((t) => t.replace(/\s*\d+%/, '')).join(' и ').toLowerCase()}</h3><p>${gp.text}</p><ul class="list">${godsList}</ul>
        ${godNatureNotes(a).map(noteHtml).join('')}
        ${combos.length ? `<h4 class="sub">Классические формулы в стволах</h4>${combos.map(noteHtml).join('')}` : ''}</div>
      <div class="card pane"><h3>Связи в карте</h3><ul class="list">${inter || '<li>Столкновений и союзов нет — карта спокойная.</li>'}</ul>
        ${bonds.map(noteHtml).join('')}</div>
    </div></details></section>`;
}

export function secCompat() {
  return `<section class="block" id="s-compat"><div class="bhead"><div><h2>Совместимость</h2></div>${evTag('compat')}<p>Сравниваем две карты целиком: что каждый даёт другому в чувствах, поддержке и деньгах. Итог — легче или труднее, без «можно/нельзя».</p></div>
    <div class="card pane"><p class="dhint" style="margin-top:0">Данные партнёра: дата, время (если известно), город и пол.</p><form class="askf cf" id="cf"><input id="cf-d" type="date" required aria-label="Дата рождения партнёра" /><input id="cf-t" type="time" aria-label="Время (если известно)" />
      <input id="cf-p" aria-label="Город рождения партнёра" placeholder="Город (если пусто — как у вас)" /><select id="cf-g" aria-label="Пол"><option value="f">Женщина</option><option value="m">Мужчина</option></select><button class="go" type="submit">Сравнить</button></form>
      <div class="ans" id="cf-out"></div>
      <div class="acts"><button class="ghost" id="pinv" type="button">Пригласить партнёра сравнить</button></div><p class="dhint" id="pinv-m">Партнёр введёт свою дату сам — и вы оба увидите пару. В ссылке будут ваши дата, время и город рождения.</p></div></section>`;
}

/** Проверка спроса на Pro (17.10): цена видна, оплаты пока нет — считаем «хочу» и контакты. Нажатия → bazi_pro_*, контакт → /api/fb note. */
export function secPro() {
  return `<section class="block" id="s-pro"><div class="card pane pro"><p class="eyebrow">Скоро · Pro</p><h3>Семья, команда и год вперёд — 399 ₽ в месяц</h3>
    <p class="dhint">Дни на 12 месяцев в календарь телефона, карты семьи или команды до 10 человек, разбор месяца в Telegram. Всё нынешнее останется бесплатным; запустим, когда наберётся сто желающих.</p>
    <div class="acts"><button class="go" id="pro-yes" type="button">Купил бы за 399 ₽</button><button class="ghost" id="pro-no" type="button">Не нужно</button></div>
    <form class="askf" id="pro-f" hidden><input id="pro-c" placeholder="Telegram или почта — напишем при запуске" aria-label="Контакт для запуска Pro" maxlength="80" /><button class="go" type="submit">Оставить</button></form><p class="dhint" id="pro-m"></p></div></section>`;
}
export function secFeedback() {
  return `<section class="block" id="s-fb"><div class="bhead"><div><h2>Разбор попал?</h2></div><p>Нам важно, где непонятно или мимо — читаем каждое сообщение. Дата рождения не отправляется.</p></div>
    <div class="card pane"><div class="dacts fbv" id="fbv"><button class="ghost" type="button" data-ok="1">Да, это я</button><button class="ghost" type="button" data-ok="0">Мимо</button></div>
    <form class="askf" id="fbf"><input id="fbq" maxlength="1500" placeholder="Что было неточно?" aria-label="Что было непонятно или неточно" /><button class="go" type="submit">Отправить</button></form><div class="ans" id="fbmsg"></div></div></section>`;
}
/** Уточнение надёжности полезных стихий для типа этой карты (отложенная выборка, confidence.ts). */
function yongExtra(a: Analysis): string {
  const k = confidence(a);
  return `Для карт вашего типа — около ${k.of10} из 10${a.brain.power.key === 'balanced' ? '; сила на грани, выбор особенно спорный' : ''}.`;
}
export function secHonest() {
  return `<section class="block" id="s-honest"><div class="bhead"><div><h2>Честно о Бацзы</h2></div><p>Расчёт точный, толкования — традиция. Что подтвердилось в наших проверках, а что нет.</p></div><div class="card pane honest">
    <p>Расчёт карты точный: сезоны — по положению Солнца, время — истинное солнечное для места рождения. Толкования — традиция, а не наука: исследований, подтверждающих связь даты рождения с судьбой, нет. Используйте карту как язык самоанализа и планирования — и проверяйте её на своей жизни.</p>
    <h3>Что мы проверили сами</h3>${evSummary()}</div></section>`;
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
