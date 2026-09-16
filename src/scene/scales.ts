// §4.2 «Зум в обе стороны»: одна и та же фигура из 9000 точек перестраивается
// в ядро → атом → клетку → ТЕЛО → горизонт → магнитосферу → орбиту → Галактику → Вселенную.
// §4.10: визуальный масштаб ≠ физическому, поэтому у каждой ступени подпись с настоящим числом.

export type ScaleTag = 'ТОЧНО' | 'ОЦЕНКА';
export interface ScaleLevel {
  exp: number;           // log10 характерного размера, м
  name: string;
  fact: string;          // настоящее число (§4.10)
  tag: ScaleTag;
  source: string;
}

export const LEVELS: ScaleLevel[] = [
  { exp: -15, name: 'ядро атома', tag: 'ТОЧНО', source: 'CODATA 2018, радиус протона',
    fact: 'Протон — 0.84 фм. Почти вся масса тела сидит в 10⁻¹⁵ его объёма.' },
  { exp: -10, name: 'атом', tag: 'ОЦЕНКА', source: 'боровский радиус; доля H по числу атомов',
    fact: 'Водород: ядро и одно электронное облако 0.5 Å. 62 % твоих атомов — такие, из первых минут.' },
  { exp: -5, name: 'клетка', tag: 'ОЦЕНКА', source: 'Bianconi et al. 2013',
    fact: '~10 мкм. В теле около 3.7·10¹³ клеток.' },
  { exp: 0, name: 'тело', tag: 'ОЦЕНКА', source: 'состав тела по числу атомов',
    fact: '1.7 м, ~7·10²⁷ атомов. Раскраска — по происхождению вещества.' },
  { exp: 4, name: 'горизонт', tag: 'ТОЧНО', source: '√(2·R·h), h = 1.6 м',
    fact: 'С высоты глаз горизонт в 4.5 км. Дальше Земля прячет сама себя.' },
  { exp: 7, name: 'магнитосфера', tag: 'ТОЧНО', source: 'IAU радиус Земли; NASA магнитопауза',
    fact: 'Радиус Земли 6371 км, магнитопауза ~10 радиусов к Солнцу. Щит от солнечного ветра.' },
  { exp: 11, name: 'орбита', tag: 'ТОЧНО', source: 'IAU 2012, 1 а.е.',
    fact: '1 а.е. = 149.6 млн км. Ты летишь по кругу 29.8 км/с и не чувствуешь.' },
  { exp: 21, name: 'Галактика', tag: 'ОЦЕНКА', source: 'GRAVITY 2019; диск Млечного Пути',
    fact: 'Диск ~100 000 св. лет; Солнце в 26 000 св. лет от центра, один оборот — 230 млн лет.' },
  { exp: 26, name: 'Вселенная', tag: 'ОЦЕНКА', source: 'Planck 2018, сопутствующий радиус',
    fact: 'Наблюдаемый радиус 46.5 млрд св. лет. Всё это — тот же водород, что в тебе.' },
];

export const BODY_LEVEL = LEVELS.findIndex((l) => l.exp === 0);

export function expLabel(exp: number): string {
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const digits = String(Math.abs(exp)).split('').map((d) => sup[Number(d)]).join('');
  return `10${exp < 0 ? '⁻' : ''}${digits} м`;
}

// Центр и радиус сцены совпадают с фигурой: LOOK=(0,0.95,0), полувысота ~0.8.
const CY = 0.95, R = 0.85;

// Живые данные для форм (§4.2 «горизонт — реальное небо», «орбита — реальные позиции»):
// звёзды alt/az в точке пользователя, гелиоцентрические позиции планет (а.е., эклиптика), Kp.
export interface LiveShapes {
  stars?: Array<{ alt: number; az: number; mag: number }>;
  bodies?: Array<{ alt: number; az: number }>;            // Солнце/Луна/планеты над горизонтом
  planets?: Array<{ key: string; x: number; y: number }>;  // гелиоцентрические, а.е.
  kp?: number;
}
export interface Shape { pos: Float32Array; col: Float32Array; }

type RGB = [number, number, number];
const C = {
  indigo: [0.42, 0.38, 0.95] as RGB, gold: [0.82, 0.68, 0.32] as RGB, red: [0.90, 0.28, 0.20] as RGB,
  white: [0.95, 0.95, 1.00] as RGB, blue: [0.35, 0.55, 1.00] as RGB, green: [0.35, 0.95, 0.55] as RGB,
  pink: [0.95, 0.45, 0.65] as RGB, dim: [0.30, 0.32, 0.45] as RGB, earth: [0.30, 0.55, 0.95] as RGB,
  orange: [0.95, 0.60, 0.25] as RGB, violet: [0.60, 0.45, 0.90] as RGB,
};

// Детерминированный генератор — форма не «прыгает» при повторном заходе на уровень.
function rng(seed: number): () => number {
  // mulberry32: соседние seed не коррелируют (в отличие от LCG).
  let a = (seed * 0x9e3779b1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number { return (r() + r() + r() + r() - 2) * 1.2; }
function sphere(r: () => number, rad: number, out: Float32Array, i: number, cx = 0, cy = CY, cz = 0): void {
  const th = r() * Math.PI * 2, ph = Math.acos(r() * 2 - 1);
  out[i] = cx + rad * Math.sin(ph) * Math.cos(th);
  out[i + 1] = cy + rad * Math.cos(ph);
  out[i + 2] = cz + rad * Math.sin(ph) * Math.sin(th);
}
function blob(r: () => number, sig: number, out: Float32Array, i: number, cx: number, cy: number, cz: number): void {
  out[i] = cx + gauss(r) * sig; out[i + 1] = cy + gauss(r) * sig; out[i + 2] = cz + gauss(r) * sig;
}

// Плоские формы (диск, кольцо, спираль) наклонены к камере (камера почти на уровне LOOK),
// иначе они видны с ребра, как линия.
function flat(out: Float32Array, i: number, x: number, v: number, jitterY = 0): void {
  out[i] = x; out[i + 1] = CY + v * 0.62 + jitterY; out[i + 2] = -v * 0.78;
}
// Доля k/n → индекс сегмента по весам (пропорции формы не зависят от числа точек).
function seg(f: number, w: number[]): number {
  let acc = 0;
  for (let i = 0; i < w.length; i++) { acc += w[i]; if (f < acc) return i; }
  return w.length - 1;
}
function tint(col: Float32Array, i: number, c: RGB, k = 1): void { col[i] = c[0] * k; col[i + 1] = c[1] * k; col[i + 2] = c[2] * k; }
function altAz(out: Float32Array, i: number, alt: number, az: number, rad: number, cy: number): void {
  const A = alt * Math.PI / 180, Z = az * Math.PI / 180;
  out[i] = rad * Math.cos(A) * Math.sin(Z); out[i + 1] = cy + rad * Math.sin(A); out[i + 2] = -rad * Math.cos(A) * Math.cos(Z);
}

// Позиции и цвета точек для уровня; body/bodyCol — исходная фигура.
export function shapeFor(level: number, body: Float32Array, bodyCol?: Float32Array, live: LiveShapes = {}): Shape {
  const n = body.length / 3;
  const out = new Float32Array(body.length), col = new Float32Array(body.length);
  const r = rng(1000 + level);
  const L = LEVELS[level];
  // Предрасчёт для уровней с данными.
  const kp = Math.max(0, Math.min(9, live.kp ?? 2));
  const stars = (live.stars?.filter((s) => s.alt > 0) ?? []).sort((a, b) => a.mag - b.mag);
  const planets = live.planets ?? [
    { key: 'mercury', x: 0.39, y: 0 }, { key: 'venus', x: -0.5, y: 0.52 }, { key: 'earth', x: -1, y: 0 }, { key: 'mars', x: 0.8, y: -1.3 },
  ];
  const AU = R * 0.55; // 1 а.е. в сцене; Марс (1.52) укладывается в кадр
  const ORBITS = [0.387, 0.723, 1.0, 1.524];
  // Вселенная: узлы паутины и нити между тремя ближайшими соседями.
  const NODES = 70, cr = rng(500 + level);
  const nodes: number[][] = [];
  for (let c = 0; c < NODES; c++) nodes.push([(cr() * 2 - 1) * R, CY + (cr() * 2 - 1) * R * 0.9, (cr() * 2 - 1) * R * 0.6]);
  const links: number[][] = [];
  for (let a = 0; a < NODES; a++) {
    const near = nodes.map((b, j) => [j, Math.hypot(b[0] - nodes[a][0], b[1] - nodes[a][1], b[2] - nodes[a][2])] as const)
      .filter(([j]) => j !== a).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [j] of near) if (a < j) links.push([a, j]);
  }
  for (let k = 0; k < n; k++) {
    const i = k * 3, f = k / n;
    switch (L.exp) {
      case -15: { // протон: три валентных кварка (цветовой заряд), глюонные нити между ними, море кварков
        const q = [[0, 0.36], [-0.31, -0.18], [0.31, -0.18]].map(([x, y]) => [x * R, CY + y * R, 0]);
        const s = seg(f, [0.33, 0.37, 0.30]);
        if (s === 0) { const j = Math.floor(r() * 3); blob(r, R * 0.06, out, i, q[j][0], q[j][1], q[j][2]); tint(col, i, [C.red, C.green, C.blue][j]); }
        else if (s === 1) { // нить: дуга между двумя кварками с волной (струна глюонного поля)
          const a = Math.floor(r() * 3), b = (a + 1) % 3, t = r();
          const w = Math.sin(t * Math.PI) * (gauss(r) * 0.03 + Math.sin(t * 14 + a * 2) * 0.02);
          out[i] = q[a][0] + (q[b][0] - q[a][0]) * t + w; out[i + 1] = q[a][1] + (q[b][1] - q[a][1]) * t + gauss(r) * 0.012;
          out[i + 2] = gauss(r) * 0.02 + w;
          tint(col, i, C.white, 0.75 + 0.25 * Math.sin(t * Math.PI));
        } else { sphere(r, R * 0.75 * Math.cbrt(r()), out, i); tint(col, i, C.indigo, 0.5); }
        break;
      }
      case -10: { // ядро (3 %) + 1s-облако exp(-ρ)
        if (k % 100 === 0) { sphere(r, 0.03 * Math.cbrt(r()), out, i); tint(col, i, C.red); }
        else { sphere(r, Math.min(R, -Math.log(1 - r() * 0.98) * R * 0.4), out, i); tint(col, i, C.indigo, 0.9); }
        break;
      }
      case -5: { // клетка: мембрана, ядро, митохондрии, цитоскелет
        const s = seg(f, [0.42, 0.2, 0.16, 0.22]);
        const NC = [R * 0.2, CY + R * 0.1, 0];
        if (s === 0) { sphere(r, R * (0.96 + r() * 0.04), out, i); out[i] *= 1.1; out[i + 1] = CY + (out[i + 1] - CY) * 0.8; tint(col, i, C.gold, 0.8); }
        else if (s === 1) { sphere(r, R * 0.28 * Math.cbrt(r()), out, i, NC[0], NC[1], NC[2]); tint(col, i, C.indigo); }
        else if (s === 2) { // 9 митохондрий: вытянутые эллипсоиды
          const m = Math.floor(r() * 9), mr = rng(77 + m);
          const cx = (mr() * 2 - 1) * R * 0.7, cy = CY + (mr() * 2 - 1) * R * 0.55, cz = (mr() * 2 - 1) * R * 0.3, ang = mr() * Math.PI;
          const u = gauss(r) * 0.09, v = gauss(r) * 0.03;
          out[i] = cx + u * Math.cos(ang) - v * Math.sin(ang); out[i + 1] = cy + u * Math.sin(ang) + v * Math.cos(ang); out[i + 2] = cz + gauss(r) * 0.03;
          tint(col, i, C.orange);
        } else { // нити цитоскелета от ядра к мембране
          const fi = Math.floor(r() * 24), fr = rng(300 + fi), th = fr() * Math.PI * 2, ph = Math.acos(fr() * 2 - 1), t = r();
          const ex = NC[0] + 1.05 * R * Math.sin(ph) * Math.cos(th), ey = NC[1] + 0.78 * R * Math.cos(ph), ez = NC[2] + R * Math.sin(ph) * Math.sin(th);
          out[i] = NC[0] + (ex - NC[0]) * t + gauss(r) * 0.006; out[i + 1] = NC[1] + (ey - NC[1]) * t + gauss(r) * 0.006; out[i + 2] = NC[2] + (ez - NC[2]) * t + gauss(r) * 0.006;
          tint(col, i, C.white, 0.5);
        }
        break;
      }
      case 0:
        out[i] = body[i]; out[i + 1] = body[i + 1]; out[i + 2] = body[i + 2];
        if (bodyCol) { col[i] = bodyCol[i]; col[i + 1] = bodyCol[i + 1]; col[i + 2] = bodyCol[i + 2]; } else tint(col, i, C.indigo);
        break;
      case 4: { // диск земли до горизонта + купол с реальным небом (звёзды по alt/az, если есть геолокация)
        const cy = CY - R * 0.35;
        const s = seg(f, [0.3, stars.length ? 0.6 : 0.62, 0.08]);
        if (s === 0) { const rr = R * Math.sqrt(r()), a = r() * Math.PI * 2; flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr, -R * 0.35 + gauss(r) * 0.01); tint(col, i, C.dim, 0.7); }
        else if (s === 1 && stars.length) { // ярким звёздам больше точек: вес ∝ 2.5^(-mag)
          const st = stars[Math.floor(Math.pow(r(), 2.2) * stars.length)];
          altAz(out, i, st.alt + gauss(r) * 0.07, st.az + gauss(r) * 0.07, R, cy);
          tint(col, i, C.white, Math.max(0.35, 1 - st.mag * 0.16));
        } else if (s === 1) { sphere(r, R, out, i, 0, cy, 0); out[i + 1] = cy + Math.abs(out[i + 1] - cy); tint(col, i, C.white, 0.45 + r() * 0.4); }
        else if (live.bodies?.length) { const b = live.bodies[Math.floor(r() * live.bodies.length)]; altAz(out, i, b.alt + gauss(r) * 0.9, b.az + gauss(r) * 0.9, R, cy); tint(col, i, C.gold); }
        else { sphere(r, R, out, i, 0, cy, 0); out[i + 1] = cy + Math.abs(out[i + 1] - cy); tint(col, i, C.gold, 0.6); }
        break;
      }
      case 7: { // Земля, дипольные линии, сжатые Солнцем (+X), хвост на ночной стороне, аврора и солнечный ветер по Kp
        // Оболочки рисуют линии (lines.ts), точкам — 40 %; ветер забирает остаток и при тихом Kp тусклее.
        const aur = 0.035 + 0.05 * kp / 9, wind = 0.36 - aur;
        const s = seg(f, [0.24, 0.40, aur, wind]);
        if (s === 0) { sphere(r, R * 0.28 * (0.9 + 0.1 * r()), out, i); tint(col, i, C.earth, 0.8); }
        else if (s === 1) {
          const Ls = R * (0.4 + 0.12 * Math.floor(r() * 5)), lat = (r() * 2 - 1) * 1.35;
          const lon = ((Math.floor(r() * 12) + 0.5) / 12) * Math.PI * 2 + gauss(r) * 0.008; // +0.5 — как в lines.ts
          const day = Math.cos(lat) * Math.cos(lon); // >0 — к Солнцу
          const squash = day > 0 ? 1 - 0.3 * day : 1 + 0.9 * (-day); // магнитопауза ~10 R⊕, хвост в разы длиннее
          const rad = Math.max(R * 0.28, Ls * Math.cos(lat) ** 2 * squash);
          out[i] = rad * Math.cos(lat) * Math.cos(lon); out[i + 1] = CY + rad * Math.sin(lat); out[i + 2] = rad * Math.cos(lat) * Math.sin(lon);
          tint(col, i, C.blue, 0.75 + 0.25 * Math.cos(lat));
        } else if (s === 2) { // авроральные овалы: колатитуда растёт с Kp (~15°+2°·Kp)
          const colat = (15 + 2.2 * kp) * Math.PI / 180 + gauss(r) * 0.02, hemi = r() < 0.5 ? 1 : -1, lon = r() * Math.PI * 2, rad = R * 0.29;
          out[i] = rad * Math.sin(colat) * Math.cos(lon); out[i + 1] = CY + hemi * rad * Math.cos(colat); out[i + 2] = rad * Math.sin(colat) * Math.sin(lon);
          tint(col, i, C.green, 0.5);
        } else { // солнечный ветер: летит с +X, огибает магнитопаузу
          const y = gauss(r) * R * 0.5, z = gauss(r) * R * 0.35, rho = Math.hypot(y, z), stand = R * 0.62;
          let x = R * 1.05 - r() * R * 1.6;
          if (rho < stand && x < stand) x = Math.max(x, stand * Math.sqrt(1 - (rho / stand) ** 2) + 0.02);
          out[i] = x; out[i + 1] = CY + y; out[i + 2] = z; tint(col, i, C.gold, 0.35 + 0.6 * kp / 9);
        }
        break;
      }
      case 11: { // Солнце, орбиты Меркурий–Марс, планеты в реальных гелиоцентрических позициях
        const s = seg(f, [0.08, 0.6, 0.32]);
        if (s === 0) { sphere(r, R * 0.1 * Math.cbrt(r()), out, i); tint(col, i, C.gold); }
        else if (s === 1) { const o = Math.floor(r() * 4), a = r() * Math.PI * 2, rr = ORBITS[o] * AU + gauss(r) * 0.005; flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr, gauss(r) * 0.003); tint(col, i, C.dim, 0.9); }
        else {
          const p = planets[Math.floor(r() * planets.length)], earth = p.key === 'earth';
          const px = p.x * AU + gauss(r) * (earth ? 0.02 : 0.012), py = p.y * AU + gauss(r) * (earth ? 0.02 : 0.012);
          flat(out, i, px, py, gauss(r) * 0.01);
          tint(col, i, earth ? C.earth : p.key === 'mars' ? C.red : p.key === 'venus' ? C.white : C.gold, earth ? 1 : 0.9);
        }
        break;
      }
      case 21: { // балдж + бар + четыре рукава (шаг ~12°) + гало; Солнце на 8.2 кпк (0.55 R) в рукаве Ориона
        const s = seg(f, [0.2, 0.06, 0.58, 0.1, 0.06]);
        if (s === 0) { const rr = R * 0.14 * Math.abs(gauss(r)), a = r() * Math.PI * 2; flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr * 0.7, gauss(r) * 0.04 * (1 - rr / (R * 0.2))); tint(col, i, C.orange, 0.85); }
        else if (s === 1) { const t = (r() * 2 - 1) * R * 0.28, a = 0.5; flat(out, i, t * Math.cos(a) + gauss(r) * 0.02, t * Math.sin(a) + gauss(r) * 0.02, gauss(r) * 0.01); tint(col, i, C.gold); }
        else if (s === 2) {
          const arm = Math.floor(r() * 4), t = r(), rr = R * 0.22 * Math.exp(t * 1.55), a = Math.log(rr / (R * 0.22)) / Math.tan(12 * Math.PI / 180) + arm * Math.PI / 2 + 0.5 + gauss(r) * 0.07;
          flat(out, i, Math.cos(a) * rr + gauss(r) * 0.02, Math.sin(a) * rr + gauss(r) * 0.02, gauss(r) * 0.012);
          tint(col, i, r() < 0.12 ? C.pink : C.blue, 0.75 + 0.25 * r());
        } else if (s === 3) { sphere(r, R * (0.4 + 0.6 * r()), out, i); out[i + 2] *= 0.5; tint(col, i, C.dim, 0.5); }
        else { const a = -Math.PI / 2 + 0.25, rr = R * 0.55; flat(out, i, Math.cos(a) * rr + gauss(r) * 0.012, Math.sin(a) * rr + gauss(r) * 0.012, gauss(r) * 0.006); tint(col, i, C.white); }
        break;
      }
      default: { // космическая паутина: узлы и нити между соседями, пустоты пусты
        const s = seg(f, [0.34, 0.56, 0.1]);
        if (s === 0) { const c = nodes[Math.floor(r() * NODES)]; blob(r, 0.035, out, i, c[0], c[1], c[2]); tint(col, i, C.gold, 0.9); }
        else if (s === 1) { const [a, b] = links[Math.floor(r() * links.length)], t = r(), A = nodes[a], B = nodes[b]; out[i] = A[0] + (B[0] - A[0]) * t + gauss(r) * 0.018; out[i + 1] = A[1] + (B[1] - A[1]) * t + gauss(r) * 0.018; out[i + 2] = A[2] + (B[2] - A[2]) * t + gauss(r) * 0.018; tint(col, i, C.violet, 0.7); }
        else { out[i] = (r() * 2 - 1) * R; out[i + 1] = CY + (r() * 2 - 1) * R * 0.9; out[i + 2] = (r() * 2 - 1) * R * 0.6; tint(col, i, C.dim, 0.35); }
      }
    }
  }
  return { pos: out, col };
}
