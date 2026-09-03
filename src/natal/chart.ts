// Каноническая круглая карта (§4.7): человек, пришедший по «натальная карта», узнаёт форму.
// Наполнение честное: реальная эклиптическая долгота Солнца. Кольцо знаков умеет
// проворачиваться на прецессию (§4.8) — гесто задаётся rotationDeg, анимируется в natal.ts.

const SIGNS: Array<[string, string]> = [
  ['♈', 'Овен'], ['♉', 'Телец'], ['♊', 'Близнецы'], ['♋', 'Рак'],
  ['♌', 'Лев'], ['♍', 'Дева'], ['♎', 'Весы'], ['♏', 'Скорпион'],
  ['♐', 'Стрелец'], ['♑', 'Козерог'], ['♒', 'Водолей'], ['♓', 'Рыбы'],
];

const CX = 200, CY = 200, R_OUT = 185, R_IN = 150, R_GLYPH = 167, R_SUN = 130;

// λ=0 (точка Овна) слева (9 часов), против часовой. SVG y вниз → вычитаем.
function polar(r: number, lonDeg: number): [number, number] {
  const a = ((180 + lonDeg) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

export interface ChartInput { sunLon: number; rotationDeg: number; }

export function natalSVG({ sunLon, rotationDeg }: ChartInput): string {
  // Градуированные тики по краю (§4.5) — фиксированный слой.
  let ticks = '';
  for (let d = 0; d < 360; d += 6) {
    const [x1, y1] = polar(R_OUT, d);
    const [x2, y2] = polar(d % 30 === 0 ? R_OUT - 12 : R_OUT - 6, d);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#bfa14a" stroke-width="${d % 30 === 0 ? 1.3 : 0.6}" opacity="0.7"/>`;
  }
  // Кольцо знаков — вращаемый слой (id=signRing).
  let sectors = '';
  for (let i = 0; i < 12; i++) {
    const [dx, dy] = polar(R_OUT, i * 30);
    sectors += `<line x1="${CX}" y1="${CY}" x2="${dx.toFixed(1)}" y2="${dy.toFixed(1)}" stroke="#bfa14a" stroke-width="0.4" opacity="0.35"/>`;
    const [gx, gy] = polar(R_GLYPH, i * 30 + 15);
    sectors += `<text x="${gx.toFixed(1)}" y="${(gy + 6).toFixed(1)}" text-anchor="middle" font-size="18" fill="#e8e2cf" font-family="Georgia,serif">${SIGNS[i][0]}</text>`;
  }
  // Солнце — фиксировано на реальной долготе (кольцо проворачивается ПОД ним).
  const [sx, sy] = polar(R_SUN, sunLon);

  return `<svg viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-label="Натальная карта">
    <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="none" stroke="#bfa14a" stroke-width="1.5" opacity="0.8"/>
    <circle cx="${CX}" cy="${CY}" r="${R_IN}" fill="none" stroke="#bfa14a" stroke-width="0.8" opacity="0.5"/>
    ${ticks}
    <g id="signRing" style="transition: transform 1.6s cubic-bezier(.4,0,.2,1); transform-box: fill-box; transform-origin: center;" transform="rotate(${rotationDeg} ${CX} ${CY})">${sectors}</g>
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="7" fill="#bfa14a"/>
    <text x="${sx.toFixed(1)}" y="${(sy - 12).toFixed(1)}" text-anchor="middle" font-size="11" fill="#e8e2cf" font-family="SF Mono,monospace">☉</text>
  </svg>`;
}
