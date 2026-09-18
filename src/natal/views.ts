// Виды карты по образцу астропроцессоров (натал / транзиты / соляр / синастрия / возвраты),
// но только то, что вычисляется: долготы, созвездия, расстояния, углы, моменты. Толкований нет.
import { Body, Observer, GeoVector, Ecliptic, Equator, Constellation, SunPosition, SearchSunLongitude, MoonPhase, Illumination, KM_PER_AU } from 'astronomy-engine';
import { SIGNS_RU, CONST_RU } from '../compute/sign';

export interface Row { key: string; glyph: string; name: string; lon: number; sign: string; constellation: string; retro: boolean; dist: string; }

const LIST: Array<[Body, string, string, string]> = [
  [Body.Sun, 'sun', '☉', 'Солнце'], [Body.Moon, 'moon', '☽', 'Луна'], [Body.Mercury, 'mercury', '☿', 'Меркурий'],
  [Body.Venus, 'venus', '♀', 'Венера'], [Body.Mars, 'mars', '♂', 'Марс'], [Body.Jupiter, 'jupiter', '♃', 'Юпитер'],
  [Body.Saturn, 'saturn', '♄', 'Сатурн'], [Body.Uranus, 'uranus', '♅', 'Уран'], [Body.Neptune, 'neptune', '♆', 'Нептун'], [Body.Pluto, 'pluto', '♇', 'Плутон'],
];
// Сидерические периоды (сут) — для оценки возвратов планет на долготу рождения.
const PERIOD_D: Record<string, number> = { mercury: 87.969, venus: 224.701, mars: 686.98, jupiter: 4332.59, saturn: 10759.22, uranus: 30688.5, neptune: 60182, pluto: 90560 };

const norm = (x: number) => ((x % 360) + 360) % 360;
const lonOf = (b: Body, t: Date) => b === Body.Sun ? SunPosition(t).elon : norm(Ecliptic(GeoVector(b, t, true)).elon);
export const fmtDeg = (d: number) => `${Math.floor(d % 30)}°${String(Math.round((d % 1) * 60)).padStart(2, '0')}′`;
export const fmtUtc = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function rows(when: Date): Row[] {
  const day = new Date(when.getTime() + 86_400_000);
  return LIST.map(([b, key, glyph, name]) => {
    const lon = lonOf(b, when);
    const eq = Equator(b, when, new Observer(0, 0, 0), true, true);
    const c = Constellation(eq.ra, eq.dec).symbol;
    let d = lonOf(b, day) - lon; if (d > 180) d -= 360; if (d < -180) d += 360;
    const v = GeoVector(b, when, true); const au = Math.hypot(v.x, v.y, v.z);
    const dist = b === Body.Sun ? `${au.toFixed(3)} а.е.` : b === Body.Moon ? `${Math.round(au * KM_PER_AU).toLocaleString('ru-RU')} км` : `${au.toFixed(2)} а.е.`;
    return { key, glyph, name, lon, sign: SIGNS_RU[Math.floor(lon / 30)], constellation: constName(c), retro: d < 0 && b !== Body.Sun && b !== Body.Moon, dist };
  });
}
const IAU3: Record<string, string> = { Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Cnc: 'Cancer', Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpius', Oph: 'Ophiuchus', Sgr: 'Sagittarius', Cap: 'Capricornus', Aqr: 'Aquarius', Psc: 'Pisces', Cet: 'Cetus', Ori: 'Orion', Sex: 'Sextans', Hya: 'Hydra', Crv: 'Corvus', Aur: 'Auriga' };
const EXTRA_RU: Record<string, string> = { Cetus: 'Кит', Orion: 'Орион', Sextans: 'Секстант', Hydra: 'Гидра', Corvus: 'Ворон', Auriga: 'Возничий' };
function constName(sym: string): string { const latin = IAU3[sym] ?? sym; return CONST_RU[latin] ?? EXTRA_RU[latin] ?? latin; }

const tbl = (head: string[], body: string[][]) =>
  `<table class="nt"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

// Таблица положений: знак гороскопа рядом с настоящим созвездием — расхождение видно в каждой строке.
export function planetsTable(when: Date, outer = true): string {
  const r = outer ? rows(when) : rows(when).slice(0, 7);
  return `<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> Геоцентрические долготы на момент, созвездие — по границам МАС, ℞ — видимое попятное движение.</p>` +
    tbl(['', 'Долгота', 'Знак (гороскоп)', 'Созвездие (небо)', 'Расстояние'],
      r.map((x) => [`${x.glyph}︎ ${x.name}${x.retro ? ' <small>℞</small>' : ''}`, `${x.lon.toFixed(2)}° <small>(${fmtDeg(x.lon)})</small>`, x.sign, `<b>${x.constellation}</b>`, x.dist]));
}

// Углы между телами — чистая геометрия. Астрология зовёт их аспектами и приписывает смысл; здесь только градусы.
const NAMED: Array<[number, string]> = [[0, 'соединение'], [60, 'секстиль'], [90, 'квадрат'], [120, 'трин'], [180, 'оппозиция']];
export function anglesTable(when: Date): string {
  const r = rows(when).slice(0, 7);
  const out: string[][] = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    let d = Math.abs(r[i].lon - r[j].lon); if (d > 180) d = 360 - d;
    const near = NAMED.find(([a]) => Math.abs(d - a) <= 3);
    out.push([`${r[i].glyph}︎ ${r[i].name} — ${r[j].glyph}︎ ${r[j].name}`, `${d.toFixed(1)}°`, near ? `<span class="nt-near">${near[1]}</span>` : '']);
  }
  return `<p class="nt-cap"><span class="tag tag-inline">[ГЕОМЕТРИЯ]</span> Угловые расстояния между телами на небе. Названия в третьей колонке — астрологическая номенклатура для углов 0/60/90/120/180° (±3°); физического содержания у них нет, это просто число градусов.</p>` +
    tbl(['Пара', 'Угол', 'Как это зовёт астрология'], out);
}

// Матрица углов (как aspect grid у астропроцессоров): треугольник пар, подсветка «именованных» углов ±3°.
export function aspectGrid(when: Date): string {
  const r = rows(when).slice(0, 7);
  const head = ['', ...r.slice(0, -1).map((x) => `${x.glyph}︎`)];
  const body = r.slice(1).map((x, i) => {
    const cells = r.slice(0, -1).map((y, j) => {
      if (j > i) return '<td class="ag-empty"></td>';
      let d = Math.abs(x.lon - y.lon); if (d > 180) d = 360 - d;
      const near = NAMED.find(([a]) => Math.abs(d - a) <= 3);
      return `<td class="${near ? 'ag-near' : ''}" title="${x.name} — ${y.name}${near ? ' · ' + near[1] : ''}">${d.toFixed(0)}°</td>`;
    });
    return `<tr><td>${x.glyph}︎ ${x.name}</td>${cells.join('')}</tr>`;
  });
  return `<p class="nt-cap">Та же геометрия матрицей: строка × столбец = угол между телами; золотом — угол в пределах 3° от 0/60/90/120/180.</p>
    <table class="nt ag"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table>`;
}

// «Транзиты»: где те же тела сейчас относительно положения в день рождения. Плюс сколько оборотов прошло.
export function transitsTable(birth: Date, now = new Date()): string {
  const a = rows(birth), b = rows(now);
  const years = (now.getTime() - birth.getTime()) / (365.25 * 86_400_000);
  const body = a.map((x, i) => {
    const d = norm(b[i].lon - x.lon);
    const orbits = PERIOD_D[x.key] ? (years * 365.25 / PERIOD_D[x.key]).toFixed(2) : x.key === 'sun' ? years.toFixed(2) : x.key === 'moon' ? (years * 365.25 / 27.3217).toFixed(0) : '';
    return [`${x.glyph}︎ ${x.name}`, `${x.lon.toFixed(1)}° · ${x.constellation}`, `${b[i].lon.toFixed(1)}° · ${b[i].constellation}${b[i].retro ? ' ℞' : ''}`, `${d.toFixed(1)}°`, orbits];
  });
  return `<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> Небо сейчас (${fmtUtc(now)}) против неба в день рождения. «Оборотов» — сколько раз тело обошло небо с тех пор (для Луны — сидерических месяцев).</p>` +
    tbl(['', 'Рождение', 'Сейчас', 'Ушло на', 'Оборотов'], body);
}

// «Соляр» по-честному: момент, когда Солнце возвращается на эклиптическую долготу рождения в данном году.
export function solarReturn(birth: Date, year: number): { at: Date | null; lon: number } {
  const lon = SunPosition(birth).elon;
  const start = new Date(Date.UTC(year, birth.getUTCMonth(), birth.getUTCDate() - 3));
  const t = SearchSunLongitude(lon, start, 8);
  return { at: t ? t.date : null, lon };
}
export function solarTable(birth: Date, year: number): string {
  const { at, lon } = solarReturn(birth, year);
  if (!at) return '<p class="nt-cap">Не удалось найти момент возвращения.</p>';
  const ill = Illumination(Body.Moon, at);
  const phase = MoonPhase(at);
  const age = (at.getTime() - birth.getTime()) / (365.25 * 86_400_000);
  const moonC = rows(at)[1].constellation;
  const drift = ((at.getTime() - Date.UTC(year, birth.getUTCMonth(), birth.getUTCDate(), birth.getUTCHours(), birth.getUTCMinutes())) / 3_600_000);
  return `<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> «Солярная карта» астрологов — это момент, когда Солнце возвращается на долготу рождения. Сам момент реален и вычислим; «карта на год» из него — нет.</p>` +
    tbl(['', ''], [
      ['Долгота Солнца при рождении', `${lon.toFixed(4)}°`],
      [`Возвращение в ${year} году`, `<b>${fmtUtc(at)}</b>`],
      ['Сдвиг от календарного дня рождения', `${drift >= 0 ? '+' : ''}${drift.toFixed(1)} ч (год длиннее 365 суток на 5 ч 49 мин)`],
      ['Прожито тропических лет', age.toFixed(4)],
      ['Луна в этот момент', `${(ill.phase_fraction * 100).toFixed(0)} % · фазовый угол ${phase.toFixed(0)}° · созвездие ${moonC}`],
    ]) + `<p class="nt-cap">Положения всех тел в момент возвращения:</p>` + planetsTable(at);
}

// «Синастрия»: два неба рядом. Разница дат, фазы Луны, углы между одноимёнными телами.
export function synastryTable(a: Date, b: Date): string {
  const ra = rows(a), rb = rows(b);
  const days = Math.abs(b.getTime() - a.getTime()) / 86_400_000;
  const ia = Illumination(Body.Moon, a), ib = Illumination(Body.Moon, b);
  const body = ra.map((x, i) => {
    let d = Math.abs(x.lon - rb[i].lon); if (d > 180) d = 360 - d;
    return [`${x.glyph}︎ ${x.name}`, `${x.lon.toFixed(1)}° · ${x.constellation}`, `${rb[i].lon.toFixed(1)}° · ${rb[i].constellation}`, `${d.toFixed(1)}°`];
  });
  return `<p class="nt-cap"><span class="tag tag-inline">[ТОЧНО]</span> Между датами ${days.toFixed(0)} суток (${(days / 365.25).toFixed(2)} года), ${(days / 29.5306).toFixed(1)} лунных месяцев. Луна: ${(ia.phase_fraction * 100).toFixed(0)} % и ${(ib.phase_fraction * 100).toFixed(0)} % освещённости. Углы — геометрия, совместимость из них не следует.</p>` +
    tbl(['', 'Первая дата', 'Вторая дата', 'Угол'], body);
}

// Возвраты планет: когда тело снова окажется на долготе рождения. Оценка по среднему периоду (±недели), не эфемеридный поиск.
export function returnsTable(birth: Date, now = new Date()): string {
  const out: string[][] = [];
  for (const [key, name] of [['mercury', 'Меркурий'], ['venus', 'Венера'], ['mars', 'Марс'], ['jupiter', 'Юпитер'], ['saturn', 'Сатурн'], ['uranus', 'Уран']] as const) {
    const p = PERIOD_D[key] * 86_400_000;
    const n = Math.floor((now.getTime() - birth.getTime()) / p);
    const next = new Date(birth.getTime() + (n + 1) * p);
    out.push([name, `${(PERIOD_D[key] / 365.25).toFixed(2)} лет`, `${n}`, next.toISOString().slice(0, 10)]);
  }
  return `<p class="nt-cap"><span class="tag tag-inline">[ОЦЕНКА]</span> Сидерический период каждой планеты известен точно; момент возврата на долготу рождения оценён по среднему периоду, реальная дата гуляет на недели из-за эксцентриситета и геоцентрических петель. «Возвращение Сатурна» — это просто 29,46 года.</p>` +
    tbl(['Планета', 'Период', 'Оборотов прошло', 'Следующий возврат ≈'], out);
}
