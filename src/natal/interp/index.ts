// «Разбор»: положения [ТОЧНО] → делинеации [ТРАДИЦИЯ] (источник) + [НАУКА] там, где есть что сказать.
// Тропический знак берётся для традиции, реальное созвездие — рядом, как факт. Тон расклада — герметический:
// «что вверху, то и внутри», душа, путь, наставление; тон данных — научный.
import { SearchMoonNode, MoonPhase, Ecliptic, GeoVector, Body } from 'astronomy-engine';
import { rows, solarReturn } from '../views';
import { SIGNS, SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN, type Delineation } from './signs';
import { PLANETS, MERCURY_IN_SIGN, VENUS_IN_SIGN, MARS_IN_SIGN, JUPITER_IN_SIGN, SATURN_IN_SIGN } from './planets';
import { HOUSES, PLANET_IN_HOUSE, houseOf } from './houses';
import { ASPECTS, PAIRS } from './aspects';
import { OUTER_GEN, OUTER_IN_HOUSE, NORTH_NODE_IN_SIGN, NORTH_NODE_IN_HOUSE, FORTUNE_IN_HOUSE, dignity, ELEMENT_TEXT, CROSS_TEXT, MOON_PHASE, RETRO, RULER_OF_SIGN } from './extras';
import { transitReading, synastryReading, directionReading, SOLAR_MOON, type TimeHit } from './time';

export interface Block { title: string; fact: string; d?: Delineation; science?: string; source: string; }

const BY_PLANET: Record<string, Delineation[]> = { sun: SUN_IN_SIGN, moon: MOON_IN_SIGN, mercury: MERCURY_IN_SIGN, venus: VENUS_IN_SIGN, mars: MARS_IN_SIGN, jupiter: JUPITER_IN_SIGN, saturn: SATURN_IN_SIGN };
const SRC_SIGN: Record<string, string> = { sun: 'Лео, HJN «The Sun in the signs»; Птолемей III.13', moon: 'Лео, HJN «The Moon in the signs»; Лилли CA I', asc: 'Лилли CA I (1-й дом); Лео, HJN «Rising sign»' };
const CLASSIC = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const PHASE_RU = ['новолунии', 'растущем серпе', 'первой четверти', 'растущей Луне', 'полнолунии', 'убывающей Луне', 'последней четверти', 'старой Луне'];
export const signIdx = (lon: number): number => Math.floor((((lon % 360) + 360) % 360) / 30);
const norm = (x: number): number => ((x % 360) + 360) % 360;
const deg = (lon: number): string => `${Math.floor(lon % 30)}°${String(Math.round((lon % 1) * 60)).padStart(2, '0')}′`;

// Северный узел: долгота Луны в ближайший момент прохождения узла (истинный узел, точность <1°).
export function northNode(when: Date): number {
  const ev = SearchMoonNode(new Date(when.getTime() - 14 * 86_400_000));
  const lon = norm(Ecliptic(GeoVector(Body.Moon, ev.time.date, true)).elon);
  return ev.kind === 1 ? lon : norm(lon + 180);
}

export interface Reading {
  blocks: Block[]; outer: Block[]; aspects: Block[]; extras: Block[]; message: string[]; noTime: boolean;
  balance: { elements: Record<string, number>; crosses: Record<string, number>; text: string[] };
  dignities: Array<{ name: string; label: string; score: number }>;
}

export function reading(when: Date, asc?: number): Reading {
  const all = rows(when);
  const bodies = all.filter((r) => CLASSIC.includes(r.key));
  const blocks: Block[] = [], outer: Block[] = [], extras: Block[] = [];
  const elements: Record<string, number> = { огонь: 0, земля: 0, воздух: 0, вода: 0 };
  const crosses: Record<string, number> = { кардинальный: 0, фиксированный: 0, мутабельный: 0 };
  const dignities: Reading['dignities'] = [];
  for (const b of bodies) {
    const s = signIdx(b.lon), meta = SIGNS[s], pm = PLANETS.find((p) => p.key === b.key)!;
    const w = b.key === 'sun' || b.key === 'moon' ? 2 : 1; elements[meta.element] += w; crosses[meta.cross] += w;
    const dg = dignity(b.key, s); if (dg) dignities.push({ name: `${b.glyph}︎ ${b.name} в ${meta.loc}`, label: dg.label, score: dg.score });
    const house = asc == null ? null : houseOf(b.lon, asc);
    const dh = house ? PLANET_IN_HOUSE[b.key]?.[house - 1] : undefined;
    blocks.push({
      title: `${b.glyph}︎ ${b.name} в ${meta.loc}${b.retro ? ' ℞' : ''}${house ? `, ${house}-й дом` : ''}`,
      fact: `${deg(b.lon)} ${meta.ru} (тропический знак) · созвездие ${b.constellation} · ${meta.element}, ${meta.cross}, управитель ${meta.ruler}${dg && dg.score ? ` · ${dg.label}` : ''}${house ? ` · дом ${house}: ${HOUSES[house - 1].ru}` : ''}`,
      d: BY_PLANET[b.key][s], science: b.key === 'sun' ? `${meta.science} ${pm.science}` : pm.science,
      source: SRC_SIGN[b.key] ?? `Лилли CA I «${pm.ru} в знаках»; Лео HJN`,
    });
    if (b.retro && RETRO[b.key]) blocks.push({ title: `${b.glyph}︎ ${b.name} ретроградный`, fact: 'Ретроградность = Земля обгоняет планету по орбите; видимое попятное движение — реальный факт неба.', d: { who: RETRO[b.key], path: '', advice: 'Ретроградная планета — не слабость, а внутренний ход: доверяй своему темпу.' }, source: 'Лилли CA I; доли — по эфемеридам' });
    if (dh) blocks.push({ title: `${b.glyph}︎ ${b.name} в ${house}-м доме — ${HOUSES[house! - 1].ru}`, fact: `Дом целознаковый от Асцендента. По Лилли ${house}-й дом: ${HOUSES[house! - 1].lilly}.`, d: dh, source: 'Лилли CA I гл. 7; Лео HJN «Planets in the houses»' });
  }
  const sunB = bodies.find((b) => b.key === 'sun')!, moonB = bodies.find((b) => b.key === 'moon')!;
  if (asc != null) {
    const s = signIdx(asc);
    elements[SIGNS[s].element] += 2; crosses[SIGNS[s].cross] += 2;
    blocks.unshift({ title: `Асцендент в ${SIGNS[s].loc}`, fact: `${deg(asc)} ${SIGNS[s].ru} восходил на востоке в минуту рождения`, d: ASC_IN_SIGN[s], science: 'Асцендент меняется на 1° каждые 4 минуты — единственный элемент карты, который действительно «твой» с точностью до минут рождения.', source: SRC_SIGN.asc });
    const rk = RULER_OF_SIGN[s], r = bodies.find((b) => b.key === rk)!, rs = signIdx(r.lon), rh = houseOf(r.lon, asc);
    extras.push({ title: `Хозяин карты — ${r.glyph}︎ ${r.name} в ${SIGNS[rs].loc}, ${rh}-й дом`, fact: `Управитель знака Асцендента (${SIGNS[s].ru} → ${r.name}) стоит в ${rh}-м доме: ${HOUSES[rh - 1].ru}.`, d: { who: `Куда идёт хозяин карты — туда идёт жизнь. Твой управитель в доме «${HOUSES[rh - 1].ru}»: здесь решается судьба, и через эту сферу ты добиваешься всего остального.`, path: PLANET_IN_HOUSE[rk][rh - 1].path, advice: PLANET_IN_HOUSE[rk][rh - 1].advice }, source: 'Лилли CA I «лорд асцендента»' });
    // Дневная карта — Солнце над горизонтом (дома 7–12 от ASC)
    const day = houseOf(sunB.lon, asc) >= 7;
    const pof = norm(day ? asc + moonB.lon - sunB.lon : asc + sunB.lon - moonB.lon), ph = houseOf(pof, asc);
    extras.push({ title: `Точка Фортуны в ${SIGNS[signIdx(pof)].loc}, ${ph}-й дом`, fact: `${deg(pof)} ${SIGNS[signIdx(pof)].ru} · формула ${day ? 'дневная: ASC + Луна − Солнце' : 'ночная: ASC + Солнце − Луна'}`, d: FORTUNE_IN_HOUSE[ph - 1], source: 'Птолемей III.10; Лилли CA I' });
  }
  for (const b of all.filter((r) => OUTER_GEN[r.key])) {
    const s = signIdx(b.lon), house = asc == null ? null : houseOf(b.lon, asc);
    outer.push({ title: `${b.glyph}︎ ${b.name} в ${SIGNS[s].loc}${house ? `, ${house}-й дом` : ''}`, fact: `${deg(b.lon)} ${SIGNS[s].ru} · созвездие ${b.constellation}${b.retro ? ' · ℞' : ''}`, d: house ? OUTER_IN_HOUSE[b.key][house - 1] : { who: OUTER_GEN[b.key], path: '', advice: 'Добавь время рождения — появится дом, а с ним личный смысл.' }, science: house ? OUTER_GEN[b.key] : undefined, source: 'Лео HJN; современная школа (Уран 1781, Нептун 1846, Плутон 1930)' });
  }
  const nn = northNode(when), ns = signIdx(nn), nh = asc == null ? null : houseOf(nn, asc);
  extras.push({ title: `Северный узел в ${SIGNS[ns].loc}${nh ? `, ${nh}-й дом` : ''} · Южный в ${SIGNS[(ns + 6) % 12].loc}`, fact: `${deg(nn)} ${SIGNS[ns].ru} — точка, где орбита Луны пересекает эклиптику; здесь случаются затмения. Оборот узлов — 18.6 года.`, d: { ...NORTH_NODE_IN_SIGN[ns], path: NORTH_NODE_IN_SIGN[ns].path + (nh ? ` Идти ${NORTH_NODE_IN_HOUSE[nh - 1]}.` : '') }, science: 'Узлы — геометрия орбиты, не тело. Возвращения узлов в 18.6, 37 и 56 лет — реальные даты.', source: 'Лилли CA I («Голова и Хвост Дракона»); джйотиш; современная школа' });
  const phase = MoonPhase(when), pi = Math.round(phase / 45) % 8;
  extras.push({ title: `Родился при ${PHASE_RU[pi]}`, fact: `Угол Солнце–Луна ${phase.toFixed(0)}°, освещённость ${(50 - 50 * Math.cos((phase * Math.PI) / 180)).toFixed(0)}%`, d: MOON_PHASE[pi], science: 'Фаза Луны при рождении — точный факт; связи с характером статистика не нашла, с датой родов — слабая и спорная.', source: 'Птолемей III.10; Радьяр «Лунный цикл» (1967)' });
  const aspects: Block[] = [];
  for (let i = 0; i < CLASSIC.length; i++) for (let j = i + 1; j < CLASSIC.length; j++) {
    const a = bodies.find((x) => x.key === CLASSIC[i])!, b = bodies.find((x) => x.key === CLASSIC[j])!;
    const diff = Math.abs(((a.lon - b.lon + 540) % 360) - 180);
    for (const asp of ASPECTS) {
      const orb = Math.abs(diff - asp.deg); if (orb > asp.orb) continue;
      const pair = PAIRS[`${CLASSIC[i]}-${CLASSIC[j]}`]; if (!pair) break;
      const kindText = asp.kind === 'conj' ? pair.c : (asp.kind === 'tri' || asp.kind === 'sex') ? pair.h : pair.t; if (!kindText) break;
      aspects.push({ title: `${a.glyph}︎ ${asp.glyph} ${b.glyph}︎ ${a.name} — ${b.name}: ${asp.ru}`, fact: `угол ${diff.toFixed(1)}°, орбис ${orb.toFixed(1)}° из ${asp.orb}°`, d: { who: kindText, path: '', advice: pair.advice }, source: 'Птолемей I.13; Лилли CA I (орбисы)' });
      break;
    }
  }
  aspects.sort((x, y) => parseFloat(x.fact.split('орбис ')[1]) - parseFloat(y.fact.split('орбис ')[1]));
  const bySign = new Map<number, string[]>(); bodies.forEach((b) => { const s = signIdx(b.lon); bySign.set(s, [...(bySign.get(s) ?? []), b.name]); });
  for (const [s, names] of bySign) if (names.length >= 3) extras.push({ title: `Стеллиум в ${SIGNS[s].loc}: ${names.join(', ')}`, fact: `${names.length} классических тел в одном знаке`, d: { who: `Тема «${SIGNS[s].key}» звучит в тебе громче всего остального — это и дар, и перекос.`, path: `Судьба концентрируется в одной сфере: ${SIGNS[s].key}.`, advice: `Сознательно развивай противоположное — ${SIGNS[(s + 6) % 12].key}.` }, source: 'Лео HJN «Satellitium»' });
  const maxEl = Object.entries(elements).sort((a, b) => b[1] - a[1]), maxCr = Object.entries(crosses).sort((a, b) => b[1] - a[1]);
  const balText = [`Ведущая стихия — ${maxEl[0][0]}: ${ELEMENT_TEXT[maxEl[0][0]].many}`];
  for (const [e, n] of maxEl) if (n === 0) balText.push(`Стихия ${e} пуста: ${ELEMENT_TEXT[e].none}`);
  balText.push(`Ведущий крест — ${maxCr[0][0]}: ${CROSS_TEXT[maxCr[0][0]]}`);
  const strong = dignities.filter((d) => d.score > 0).map((d) => d.name.split(' в ')[0]).join(', '), weak = dignities.filter((d) => d.score < 0).map((d) => d.name.split(' в ')[0]).join(', ');
  const ss = signIdx(sunB.lon), ms = signIdx(moonB.lon);
  const message = [
    `Что вверху, то и внутри тебя. В минуту твоего рождения Солнце стояло в ${SIGNS[ss].loc}, Луна — в ${SIGNS[ms].loc}${asc != null ? `, а на востоке восходил знак ${SIGNS[signIdx(asc)].ru}` : ''}. Это не предсказание — это узор, с которым ты пришёл, и вот как его читает традиция.`,
    `Солнце. ${SUN_IN_SIGN[ss].path}`,
    `Луна. ${MOON_IN_SIGN[ms].path}`,
    asc != null ? `Асцендент, дверь в мир. ${ASC_IN_SIGN[signIdx(asc)].path}` : 'Дверь в мир (Асцендент) откроется, когда добавишь время и место рождения.',
    `Узлы, дорога души. ${NORTH_NODE_IN_SIGN[ns].path}${nh ? ` Идти ${NORTH_NODE_IN_HOUSE[nh - 1]}.` : ''}`,
    aspects[0] ? `Главный аспект — ${aspects[0].title.split(': ')[0]}. ${aspects[0].d!.who}` : 'Планеты не связаны точными аспектами: редкий «тихий» узор — небо не давит и не толкает, всё решает воля.',
    strong ? `Сильны по достоинству: ${strong} — на них опирайся.` : '', weak ? `Слабы по достоинству: ${weak} — здесь судьба учит, а не даёт.` : '',
    `Фаза Луны. ${MOON_PHASE[pi].path}`,
    `Наставление карты: ${SUN_IN_SIGN[ss].advice} ${NORTH_NODE_IN_SIGN[ns].advice}`,
  ].filter(Boolean);
  return { blocks, outer, aspects, extras, message, noTime: asc == null, balance: { elements, crosses, text: balText }, dignities };
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const block = (b: Block): string => `<article class="rz">
  <h4>${b.title}</h4>
  ${b.d ? `<p class="rz-trad">${esc(b.d.who)}${b.d.path ? ` <b>Путь:</b> ${esc(b.d.path)}` : ''}${b.d.advice ? ` <b>Наставление:</b> ${esc(b.d.advice)}` : ''}</p>` : ''}
  <p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> ${esc(b.fact)}</p>
  ${b.science ? `<p class="rz-sci"><span class="tag tag-inline">[НАУКА]</span> ${esc(b.science)}</p>` : ''}
  <p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> ${esc(b.source)}</p>
</article>`;

export function readingHtml(when: Date, asc?: number): string {
  const r = reading(when, asc);
  const el = Object.entries(r.balance.elements).map(([k, v]) => `${k} ${v}`).join(' · '), cr = Object.entries(r.balance.crosses).map(([k, v]) => `${k} ${v}`).join(' · ');
  return `<div class="rz-wrap">
  <section class="rz-syn"><h3>Послание карты</h3>${r.message.map((s) => `<p>${esc(s)}</p>`).join('')}
    <p class="rz-fact">Положения — по эфемеридам VSOP87/ELP [ТОЧНО]; трактовка — школа Птолемея, Лилли, Лео [ТРАДИЦИЯ]; рядом — что знает наука [НАУКА]. Что из этого судьба, решаешь ты.</p></section>
  ${r.noTime ? '<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> Без времени и места рождения нет Асцендента, домов, хозяина карты и Точки Фортуны. Добавь время — разбор станет вдвое длиннее.</p>' : ''}
  <h3>Стихии и кресты</h3><article class="rz">${r.balance.text.map((t) => `<p class="rz-trad">${esc(t)}</p>`).join('')}<p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> Веса: Солнце, Луна${r.noTime ? '' : ', Асцендент'} ×2, планеты ×1 · стихии: ${el} · кресты: ${cr}</p><p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> Лео HJN «Triplicities and Quadruplicities»</p></article>
  <h3>Достоинства планет</h3><article class="rz"><p class="rz-trad">${r.dignities.map((d) => `${d.name} — <b>${d.label}</b>`).join(' · ')}</p><p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> Таблица обителей, экзальтаций, изгнаний и падений — Птолемей I.17–19. Обитель/экзальтация — планета «у себя», изгнание/падение — «в гостях», работает с усилием.</p></article>
  <h3>Светила, планеты${r.noTime ? '' : ', дома'}</h3>${r.blocks.map(block).join('')}
  <h3>Судьба и путь</h3>${r.extras.map(block).join('')}
  <h3>Внешние планеты</h3>${r.outer.map(block).join('')}
  <h3>Аспекты (${r.aspects.length})</h3>${r.aspects.length ? r.aspects.map(block).join('') : '<p class="nt-cap">Точных аспектов между классическими планетами нет — редкий, «тихий» рисунок.</p>'}
</div>`;
}

const KIND_RU = { c: 'соединение', h: 'гармония', t: 'напряжение' } as const;
const hitHtml = (d: TimeHit): string => `<article class="rz rz-${d.kind}"><h4>${esc(d.head)} <small>${KIND_RU[d.kind]}</small></h4><p class="rz-trad">${esc(d.text)}</p><p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> ${esc(d.point)}</p></article>`;
export function transitHtml(birth: Date, now: Date, asc?: number): string {
  const t = transitReading(rows(birth), rows(now), asc);
  const dateRu = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `<div class="rz-wrap"><h3>Что включено сейчас · ${dateRu}</h3>${t.length ? t.map(hitHtml).join('') : '<p class="nt-cap">Точных транзитов (орбис 3°) к твоим планетам сейчас нет — спокойный период.</p>'}<p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> Лилли CA III; Лео «The Progressed Horoscope». <span class="tag tag-inline">[НАУКА]</span> Положения — эфемериды; влияние транзитов на события статистикой не подтверждено.</p></div>`;
}
export function synastryHtml(a: Date, b: Date): string {
  const s = synastryReading(rows(a), rows(b));
  return `<div class="rz-wrap"><h3>Что между вами</h3>${s.length ? s.map(hitHtml).join('') : '<p class="nt-cap">Точных аспектов между картами нет — связь строится волей, не небом.</p>'}<p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> Птолемей IV.5 «О дружбе и вражде»; Лео HJN.</p></div>`;
}
export function solarHtml(birth: Date, year: number): string {
  const { at } = solarReturn(birth, year); if (!at) return '';
  const m = rows(at).find((x) => x.key === 'moon')!, ms = signIdx(m.lon);
  return `<div class="rz-wrap"><h3>Тема года ${year}–${year + 1}</h3><article class="rz"><h4>☽ Луна соляра в ${SIGNS[ms].loc}</h4><p class="rz-trad">${SOLAR_MOON[ms][0].toUpperCase()}${SOLAR_MOON[ms].slice(1)}. ${MOON_IN_SIGN[ms].advice}</p><p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> Возвращение Солнца ${at.toISOString().slice(0, 16).replace('T', ' ')} UTC; Луна ${deg(m.lon)} ${SIGNS[ms].ru}.</p><p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> Лилли CA III «Революции»</p></article></div>`;
}

// Symbolic directions to a target date: arc = years of life, 1° per year.
export function directionsHtml(birth: Date, at: Date, asc?: number): string {
  const age = (at.getTime() - birth.getTime()) / (365.2422 * 864e5);
  if (age <= 0) return '';
  const d = directionReading(rows(birth), age, asc);
  const dateRu = at.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `<div class="rz-wrap"><h3>Дирекции на ${dateRu} · дуга ${age.toFixed(2)}°</h3>${d.length ? d.map(hitHtml).join('') : '<p class="nt-cap">Точных дирекций (орбис 1° ≈ год) к твоим точкам сейчас нет — ровный период без поворотных тем.</p>'}<p class="rz-src"><span class="tag tag-inline">[ТРАДИЦИЯ]</span> Символические дирекции «градус за год»: Лилли CA III; Лео «The Progressed Horoscope». <span class="tag tag-inline">[НАУКА]</span> Сдвиг символический — на небе так ничего не движется; ниже таблица того, что реально изменилось.</p></div>`;
}
