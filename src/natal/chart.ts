// Глифы знаков с U+FE0E — текстовое начертание, не emoji (§4.5: гравюра, не смайлы).
// Каноническая круглая карта (§4.7): человек, пришедший по «натальная карта», узнаёт форму.
// Наполнение честное: реальная эклиптическая долгота Солнца. Кольцо знаков умеет
// проворачиваться на прецессию (§4.8) — гесто задаётся rotationDeg, анимируется в natal.ts.

const SIGNS: Array<[string, string]> = [
  ['♈', 'Овен'], ['♉', 'Телец'], ['♊', 'Близнецы'], ['♋', 'Рак'],
  ['♌', 'Лев'], ['♍', 'Дева'], ['♎', 'Весы'], ['♏', 'Скорпион'],
  ['♐', 'Стрелец'], ['♑', 'Козерог'], ['♒', 'Водолей'], ['♓', 'Рыбы'],
];

const CX = 200, CY = 200, R_OUT = 185, R_IN = 150, R_GLYPH = 167, R_PL = 122, R_ASP = 88;
const ASPECTS: Array<[number, string]> = [[60, '#8fb7a5'], [90, '#c98f8f'], [120, '#8fb7a5'], [180, '#c98f8f']];
const ORB = 3;

// Слева (9 часов) — точка Овна, либо ASC, если он известен (канон §4.7). Против часовой. SVG y вниз → вычитаем.
function polar(r: number, lonDeg: number, offset = 0): [number, number] {
  const a = ((180 + lonDeg - offset) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

export interface ChartBody { glyph: string; lon: number; key: string; retro?: boolean; }
export interface ChartInput { sunLon: number; rotationDeg: number; asc?: number; mc?: number; bodies?: ChartBody[]; sky?: Array<Array<[number, number]>>; }

// §4.7: линии реальных зодиакальных созвездий в кольце (широта ±30° → R_IN…R_OUT). Скрыты до поворота (§4.8).
export function skyLines(sky: Array<Array<[number, number]>>, off: number): string {
  const r = (lat: number) => R_IN + ((Math.max(-30, Math.min(30, lat)) + 30) / 60) * (R_OUT - R_IN);
  const d = sky.map((pl) => pl.map(([lon, lat], i) => { const [x, y] = polar(r(lat), lon, off); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ')).join(' ');
  return `<g id="realSky" style="opacity:0; transition: opacity 1.6s ease"><path d="${d}" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.55"/></g>`;
}

export function natalSVG({ sunLon, rotationDeg, asc, mc, bodies, sky }: ChartInput): string {
  const off = asc ?? 0;
  // Градуированные тики по краю (§4.5) — фиксированный слой.
  let ticks = '';
  for (let d = 0; d < 360; d += 6) {
    const [x1, y1] = polar(R_OUT, d, off);
    const [x2, y2] = polar(d % 30 === 0 ? R_OUT - 12 : R_OUT - 6, d, off);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#c9a85c" stroke-width="${d % 30 === 0 ? 1.3 : 0.6}" opacity="0.7"/>`;
  }
  // Кольцо знаков — вращаемый слой (id=signRing).
  let sectors = '';
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      const [a1, b1] = polar(R_OUT, i * 30, off), [a2, b2] = polar(R_OUT, i * 30 + 30, off), [c1, d1] = polar(R_IN, i * 30 + 30, off), [c2, d2] = polar(R_IN, i * 30, off);
      sectors += `<path d="M${a1.toFixed(1)} ${b1.toFixed(1)} A${R_OUT} ${R_OUT} 0 0 0 ${a2.toFixed(1)} ${b2.toFixed(1)} L${c1.toFixed(1)} ${d1.toFixed(1)} A${R_IN} ${R_IN} 0 0 1 ${c2.toFixed(1)} ${d2.toFixed(1)} Z" fill="#c9a85c" opacity="0.045"/>`;
    }
    const [dx, dy] = polar(R_OUT, i * 30, off);
    sectors += `<line x1="${CX}" y1="${CY}" x2="${dx.toFixed(1)}" y2="${dy.toFixed(1)}" stroke="#c9a85c" stroke-width="0.4" opacity="0.35"/>`;
    const [gx, gy] = polar(R_GLYPH, i * 30 + 15, off);
    sectors += `<text x="${gx.toFixed(1)}" y="${(gy + 6).toFixed(1)}" text-anchor="middle" font-size="19" fill="currentColor" font-family="Georgia,serif" opacity="0.92">${SIGNS[i][0]}\uFE0E</text>`;
  }
  // Тела (включая Солнце) на внутреннем кольце: метка положения на R_IN, глиф, градус в знаке, ℞.
  // Близкие тела разводим по радиусу, чтобы глифы не слипались. Солнце — золотой диск.
  let planets = '';
  let aspects = '';
  const all = bodies ?? [{ key: 'sun', glyph: '☉', lon: sunLon }];
  const sorted = [...all].sort((a, b) => a.lon - b.lon);
  let prev = -99, lvl = 0;
  for (const b of sorted) {
    lvl = b.lon - prev < 10 ? (lvl + 1) % 3 : 0; prev = b.lon;
    const r = R_PL - lvl * 17;
    const [px, py] = polar(r, b.lon, off), [t1x, t1y] = polar(R_IN, b.lon, off), [t2x, t2y] = polar(R_IN - 5, b.lon, off);
    const deg = Math.floor(b.lon % 30);
    planets += `<line x1="${t1x.toFixed(1)}" y1="${t1y.toFixed(1)}" x2="${t2x.toFixed(1)}" y2="${t2y.toFixed(1)}" stroke="#c9a85c" stroke-width="1.3" opacity=".9"/>
      <line x1="${t2x.toFixed(1)}" y1="${t2y.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#c9a85c" stroke-width=".35" opacity=".3"/>`;
    if (b.key === 'sun') planets += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8.5" fill="#c9a85c"/><text x="${px.toFixed(1)}" y="${(py + 4.2).toFixed(1)}" text-anchor="middle" font-size="12" fill="#120f2a" font-family="Georgia,serif">☉\uFE0E</text>`;
    else planets += `<text x="${px.toFixed(1)}" y="${(py + 5.5).toFixed(1)}" text-anchor="middle" font-size="16" fill="currentColor" font-family="Georgia,serif" opacity=".96">${b.glyph}\uFE0E</text>`;
    planets += `<text x="${px.toFixed(1)}" y="${(py + 14).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#c9a85c" font-family="SF Mono,Menlo,monospace" opacity=".9">${deg}°${b.retro ? '℞' : ''}</text>`;
  }
  // Геометрия: хорды между телами, чей угол в пределах ±3° от 60/90/120/180 (те же, что в таблице «Углы»).
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    let d = Math.abs(sorted[i].lon - sorted[j].lon); if (d > 180) d = 360 - d;
    const hit = ASPECTS.find(([a]) => Math.abs(d - a) <= ORB); if (!hit) continue;
    const [x1, y1] = polar(R_ASP, sorted[i].lon, off), [x2, y2] = polar(R_ASP, sorted[j].lon, off);
    aspects += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${hit[1]}" stroke-width="${hit[0] === 180 || hit[0] === 120 ? 1 : .7}" opacity=".75"><title>${sorted[i].glyph}–${sorted[j].glyph} ${d.toFixed(1)}°</title></line>`;
  }
  // Оси ASC–DSC (горизонт) и MC–IC (меридиан) — только если известны время и место.
  let axes = '';
  if (asc != null && mc != null) {
    const [mx, my] = polar(R_OUT, mc, off), [ix, iy] = polar(R_OUT, mc + 180, off);
    axes = `<line x1="${CX - R_OUT}" y1="${CY}" x2="${CX + R_OUT}" y2="${CY}" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
    <line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
    <text x="${CX - R_OUT + 4}" y="${CY - 5}" font-size="10" fill="currentColor" font-family="SF Mono,monospace">ASC ${asc.toFixed(0)}°</text>
    <text x="${(mx + 6).toFixed(1)}" y="${(my + 4).toFixed(1)}" font-size="10" fill="currentColor" font-family="SF Mono,monospace">MC</text>`;
  }

  return `<svg viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-label="Натальная карта">
    <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="none" stroke="#c9a85c" stroke-width="1.5" opacity="0.8"/>
    <circle cx="${CX}" cy="${CY}" r="${R_IN}" fill="none" stroke="#c9a85c" stroke-width="0.8" opacity="0.5"/>
    ${ticks}
    ${axes}
    ${sky ? skyLines(sky, off) : ''}
    <g id="signRing" style="transition: transform 1.6s cubic-bezier(.4,0,.2,1); transform-box: view-box; transform-origin: 200px 200px; transform: rotate(${rotationDeg}deg);">${sectors}</g>
    <circle cx="${CX}" cy="${CY}" r="${R_ASP}" fill="none" stroke="#c9a85c" stroke-width="0.5" opacity="0.3"/>
    ${aspects}
    ${planets}
    <circle cx="${CX}" cy="${CY}" r="1.6" fill="#c9a85c" opacity=".8"/>
  </svg>`;
}
