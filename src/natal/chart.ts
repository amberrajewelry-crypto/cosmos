// Глифы знаков с U+FE0E — текстовое начертание, не emoji (§4.5: гравюра, не смайлы).
// Каноническая круглая карта (§4.7): человек, пришедший по «натальная карта», узнаёт форму.
// Наполнение честное: реальная эклиптическая долгота Солнца. Кольцо знаков умеет
// проворачиваться на прецессию (§4.8) — гесто задаётся rotationDeg, анимируется в natal.ts.

const SIGNS: Array<[string, string]> = [
  ['♈', 'Овен'], ['♉', 'Телец'], ['♊', 'Близнецы'], ['♋', 'Рак'],
  ['♌', 'Лев'], ['♍', 'Дева'], ['♎', 'Весы'], ['♏', 'Скорпион'],
  ['♐', 'Стрелец'], ['♑', 'Козерог'], ['♒', 'Водолей'], ['♓', 'Рыбы'],
];

const CX = 200, CY = 200, R_OUT = 185, R_IN = 150, R_GLYPH = 167, R_SUN = 130;

// Слева (9 часов) — точка Овна, либо ASC, если он известен (канон §4.7). Против часовой. SVG y вниз → вычитаем.
function polar(r: number, lonDeg: number, offset = 0): [number, number] {
  const a = ((180 + lonDeg - offset) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

export interface ChartInput { sunLon: number; rotationDeg: number; asc?: number; mc?: number; }

export function natalSVG({ sunLon, rotationDeg, asc, mc }: ChartInput): string {
  const off = asc ?? 0;
  // Градуированные тики по краю (§4.5) — фиксированный слой.
  let ticks = '';
  for (let d = 0; d < 360; d += 6) {
    const [x1, y1] = polar(R_OUT, d, off);
    const [x2, y2] = polar(d % 30 === 0 ? R_OUT - 12 : R_OUT - 6, d, off);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#bfa14a" stroke-width="${d % 30 === 0 ? 1.3 : 0.6}" opacity="0.7"/>`;
  }
  // Кольцо знаков — вращаемый слой (id=signRing).
  let sectors = '';
  for (let i = 0; i < 12; i++) {
    const [dx, dy] = polar(R_OUT, i * 30, off);
    sectors += `<line x1="${CX}" y1="${CY}" x2="${dx.toFixed(1)}" y2="${dy.toFixed(1)}" stroke="#bfa14a" stroke-width="0.4" opacity="0.35"/>`;
    const [gx, gy] = polar(R_GLYPH, i * 30 + 15, off);
    sectors += `<text x="${gx.toFixed(1)}" y="${(gy + 6).toFixed(1)}" text-anchor="middle" font-size="18" fill="#e8e2cf" font-family="Georgia,serif">${SIGNS[i][0]}\uFE0E</text>`;
  }
  // Солнце — фиксировано на реальной долготе (кольцо проворачивается ПОД ним).
  const [sx, sy] = polar(R_SUN, sunLon, off);
  // Оси ASC–DSC (горизонт) и MC–IC (меридиан) — только если известны время и место.
  let axes = '';
  if (asc != null && mc != null) {
    const [mx, my] = polar(R_OUT, mc, off), [ix, iy] = polar(R_OUT, mc + 180, off);
    axes = `<line x1="${CX - R_OUT}" y1="${CY}" x2="${CX + R_OUT}" y2="${CY}" stroke="#e8e2cf" stroke-width="1.2" opacity="0.8"/>
    <line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="#e8e2cf" stroke-width="1.2" opacity="0.8"/>
    <text x="${CX - R_OUT + 4}" y="${CY - 5}" font-size="10" fill="#e8e2cf" font-family="SF Mono,monospace">ASC ${asc.toFixed(0)}°</text>
    <text x="${(mx + 6).toFixed(1)}" y="${(my + 4).toFixed(1)}" font-size="10" fill="#e8e2cf" font-family="SF Mono,monospace">MC</text>`;
  }

  return `<svg viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-label="Натальная карта">
    <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="none" stroke="#bfa14a" stroke-width="1.5" opacity="0.8"/>
    <circle cx="${CX}" cy="${CY}" r="${R_IN}" fill="none" stroke="#bfa14a" stroke-width="0.8" opacity="0.5"/>
    ${ticks}
    ${axes}
    <g id="signRing" style="transition: transform 1.6s cubic-bezier(.4,0,.2,1); transform-box: view-box; transform-origin: 200px 200px; transform: rotate(${rotationDeg}deg);">${sectors}</g>
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="7" fill="#bfa14a"/>
    <text x="${sx.toFixed(1)}" y="${(sy - 12).toFixed(1)}" text-anchor="middle" font-size="11" fill="#e8e2cf" font-family="SF Mono,monospace">☉</text>
  </svg>`;
}
