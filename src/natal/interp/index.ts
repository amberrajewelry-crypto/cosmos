// «Разбор»: положения [ТОЧНО] → делинеации [ТРАДИЦИЯ] (источник) + [НАУКА] там, где есть что сказать.
// Тропический знак берётся для традиции, реальное созвездие — рядом, как факт.
import { rows } from '../views';
import { SIGNS, SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN, type Delineation } from './signs';
import { PLANETS, MERCURY_IN_SIGN, VENUS_IN_SIGN, MARS_IN_SIGN, JUPITER_IN_SIGN, SATURN_IN_SIGN } from './planets';
import { HOUSES, PLANET_IN_HOUSE, houseOf } from './houses';
import { ASPECTS, PAIRS } from './aspects';

export type Tag = 'ТОЧНО' | 'ТРАДИЦИЯ' | 'НАУКА';
export interface Block { title: string; fact: string; d?: Delineation; science?: string; source: string; }

const BY_PLANET: Record<string, Delineation[]> = { sun: SUN_IN_SIGN, moon: MOON_IN_SIGN, mercury: MERCURY_IN_SIGN, venus: VENUS_IN_SIGN, mars: MARS_IN_SIGN, jupiter: JUPITER_IN_SIGN, saturn: SATURN_IN_SIGN };
const SRC_SIGN: Record<string, string> = { sun: 'Лео, HJN «The Sun in the signs»; Птолемей III.13', moon: 'Лео, HJN «The Moon in the signs»; Лилли CA I', asc: 'Лилли CA I (1-й дом); Лео, HJN «Rising sign»' };
const signIdx = (lon: number): number => Math.floor((((lon % 360) + 360) % 360) / 30);
const deg = (lon: number): string => `${Math.floor(lon % 30)}°${String(Math.round((lon % 1) * 60)).padStart(2, '0')}′`;

export interface Reading { blocks: Block[]; aspects: Block[]; synthesis: string[]; noTime: boolean; }

export function reading(when: Date, asc?: number): Reading {
  const bodies = rows(when).filter((r) => BY_PLANET[r.key]);
  const blocks: Block[] = [];
  for (const b of bodies) {
    const s = signIdx(b.lon), meta = SIGNS[s], pm = PLANETS.find((p) => p.key === b.key)!;
    const d = BY_PLANET[b.key]?.[s];
    const house = asc == null ? null : houseOf(b.lon, asc);
    const dh = house ? PLANET_IN_HOUSE[b.key]?.[house - 1] : undefined;
    blocks.push({
      title: `${b.glyph}︎ ${b.name} в ${meta.loc}${b.retro ? ' ℞' : ''}${house ? `, ${house}-й дом` : ''}`,
      fact: `${deg(b.lon)} ${meta.ru} (тропический знак) · созвездие ${b.constellation} · ${meta.element}, ${meta.cross}, управитель ${meta.ruler}${house ? ` · дом ${house}: ${HOUSES[house - 1].ru}` : ''}`,
      d, science: b.key === 'sun' ? `${meta.science} ${pm.science}` : pm.science,
      source: SRC_SIGN[b.key] ?? `Лилли CA I «${pm.ru} в знаках»; Лео HJN`,
    });
    if (dh) blocks.push({ title: `${b.glyph}︎ ${b.name} в ${house}-м доме — ${HOUSES[house! - 1].ru}`, fact: `Дом целознаковый от Асцендента. По Лилли ${house}-й дом: ${HOUSES[house! - 1].lilly}.`, d: dh, source: 'Лилли CA I гл. 7; Лео HJN «Planets in the houses»' });
  }
  if (asc != null) {
    const s = signIdx(asc);
    blocks.unshift({ title: `Асцендент в ${SIGNS[s].loc}`, fact: `${deg(asc)} ${SIGNS[s].ru} восходил на востоке в минуту рождения`, d: ASC_IN_SIGN[s], science: 'Асцендент меняется на 1° каждые 4 минуты — единственный элемент карты, который действительно «твой» с точностью до минут рождения.', source: SRC_SIGN.asc });
  }
  // Аспекты между классическими телами
  const aspects: Block[] = [];
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = bodies.find((x) => x.key === keys[i])!, b = bodies.find((x) => x.key === keys[j])!;
    const diff = Math.abs(((a.lon - b.lon + 540) % 360) - 180);
    for (const asp of ASPECTS) {
      const orb = Math.abs(diff - asp.deg);
      if (orb > asp.orb) continue;
      const pair = PAIRS[`${keys[i]}-${keys[j]}`]; if (!pair) break;
      const kindText = asp.kind === 'conj' ? pair.c : (asp.kind === 'tri' || asp.kind === 'sex') ? pair.h : pair.t;
      if (!kindText) break;
      aspects.push({ title: `${a.glyph}︎ ${asp.glyph} ${b.glyph}︎ ${a.name} — ${b.name}: ${asp.ru}`, fact: `угол ${diff.toFixed(1)}°, орбис ${orb.toFixed(1)}° из ${asp.orb}°`, d: { who: kindText, path: '', advice: pair.advice }, source: 'Птолемей I.13; Лилли CA I (орбисы)', science: undefined });
      break;
    }
  }
  aspects.sort((x, y) => parseFloat(x.fact.split('орбис ')[1]) - parseFloat(y.fact.split('орбис ')[1]));
  // Синтез: Солнце + Луна + ASC + самый точный аспект
  const sun = blocks.find((b) => b.title.includes('Солнце в') && !b.title.includes('доме')), moon = blocks.find((b) => b.title.includes('Луна в') && !b.title.includes('доме'));
  const synthesis: string[] = [];
  if (sun?.d) synthesis.push(`Ядро: ${sun.d.path}`);
  if (moon?.d) synthesis.push(`Потребность: ${moon.d.path}`);
  if (asc != null) synthesis.push(`Дверь: ${ASC_IN_SIGN[signIdx(asc)].path}`);
  if (aspects[0]?.d) synthesis.push(`Главное напряжение/дар: ${aspects[0].title.split(': ')[0]} — ${aspects[0].d.advice}`);
  if (sun?.d) synthesis.push(`Наставление: ${sun.d.advice}`);
  return { blocks, aspects, synthesis, noTime: asc == null };
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const block = (b: Block): string => `<article class="rz">
  <h4>${b.title}</h4>
  <p class="rz-fact"><span class="tag tag-inline">[ТОЧНО]</span> ${esc(b.fact)}</p>
  ${b.d ? `<p><span class="tag tag-inline">[ТРАДИЦИЯ]</span> ${esc(b.d.who)}${b.d.path ? ` <b>Путь:</b> ${esc(b.d.path)}` : ''} <b>Наставление:</b> ${esc(b.d.advice)}</p>` : ''}
  ${b.science ? `<p class="rz-sci"><span class="tag tag-inline">[НАУКА]</span> ${esc(b.science)}</p>` : ''}
  <p class="rz-src">Источник: ${esc(b.source)}</p>
</article>`;

export function readingHtml(when: Date, asc?: number): string {
  const r = reading(when, asc);
  return `<div class="rz-wrap">
  <p class="nt-cap">Разбор по классике: положение вычислено по настоящему небу [ТОЧНО], трактовка — школа Птолемея, Лилли и Лео [ТРАДИЦИЯ], рядом — что об этом знает наука [НАУКА]. Что из этого судьба, а что характер, решаешь ты.</p>
  ${r.noTime ? '<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> Без времени и места рождения нет Асцендента и домов — разбор по знакам и аспектам. Добавь время — появятся 12 домов.</p>' : ''}
  <section class="rz-syn"><h3>Ядро карты</h3>${r.synthesis.map((s) => `<p>${esc(s)}</p>`).join('')}</section>
  <h3>Планеты в знаках${r.noTime ? '' : ' и домах'}</h3>${r.blocks.map(block).join('')}
  <h3>Аспекты (${r.aspects.length})</h3>${r.aspects.length ? r.aspects.map(block).join('') : '<p class="nt-cap">Точных аспектов между классическими планетами нет — редкий, «тихий» рисунок.</p>'}
</div>`;
}
