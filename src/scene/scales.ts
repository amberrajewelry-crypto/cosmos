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

// Плоские формы (диск, кольцо, спираль) наклонены к камере (камера почти на уровне LOOK),
// иначе они видны с ребра, как линия.
function flat(out: Float32Array, i: number, x: number, v: number, jitterY = 0): void {
  out[i] = x; out[i + 1] = CY + v * 0.62 + jitterY; out[i + 2] = -v * 0.78;
}

// Позиции точек для уровня; body — исходные позиции фигуры.
export function shapeFor(level: number, body: Float32Array): Float32Array {
  const n = body.length / 3;
  const out = new Float32Array(body.length);
  const r = rng(1000 + level);
  const L = LEVELS[level];
  for (let k = 0; k < n; k++) {
    const i = k * 3;
    switch (L.exp) {
      case -15: // плотный шар нуклонов с зернистостью
        sphere(r, R * 0.42 * Math.cbrt(r()), out, i);
        break;
      case -10: { // ядро (3 %) + 1s-облако exp(-ρ)
        if (k % 33 === 0) sphere(r, 0.02, out, i);
        else sphere(r, Math.min(R, -Math.log(1 - r() * 0.98) * R * 0.28), out, i);
        break;
      }
      case -5: { // мембрана-эллипсоид + ядро клетки
        if (k % 4 === 0) sphere(r, R * 0.28, out, i, R * 0.2, CY + R * 0.1, 0);
        else { sphere(r, R * (0.96 + r() * 0.04), out, i); out[i] *= 1.1; out[i + 1] = CY + (out[i + 1] - CY) * 0.8; }
        break;
      }
      case 0:
        out[i] = body[i]; out[i + 1] = body[i + 1]; out[i + 2] = body[i + 2];
        break;
      case 4: { // диск земли до горизонта + купол неба
        if (k % 3 === 0) { sphere(r, R, out, i, 0, CY - R * 0.35, 0); out[i + 1] = CY - R * 0.35 + Math.abs(out[i + 1] - (CY - R * 0.35)); }
        else { const rr = R * Math.sqrt(r()), a = r() * Math.PI * 2; flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr, -R * 0.35 + gauss(r) * 0.01); }
        break;
      }
      case 7: { // Земля + дипольные силовые линии r = L·cos²(широта)
        if (k % 5 === 0) sphere(r, R * 0.3, out, i);
        else {
          // Дискретные оболочки L и меридианы — линии читаются как линии, а не как туман.
          const Ls = R * (0.4 + 0.13 * Math.floor(r() * 5)), lat = (r() * 2 - 1) * 1.35;
          const lon = (Math.floor(r() * 10) / 10) * Math.PI * 2 + gauss(r) * 0.02;
          // Силовая линия ниже поверхности — сажаем на поверхность (линия «входит» в Землю).
          const rad = Math.max(R * 0.3, Ls * Math.cos(lat) ** 2);
          out[i] = rad * Math.cos(lat) * Math.cos(lon);
          out[i + 1] = CY + rad * Math.sin(lat);
          out[i + 2] = rad * Math.cos(lat) * Math.sin(lon);
        }
        break;
      }
      case 11: { // Солнце в центре, кольцо орбиты, Земля-точка
        if (k % 8 === 0) sphere(r, R * 0.12 * Math.cbrt(r()), out, i);
        else if (k % 8 === 1) { flat(out, i, R * 0.9, 0); sphere(r, 0.03, out, i, out[i], out[i + 1], out[i + 2]); }
        else { const a = r() * Math.PI * 2, rr = R * 0.9 + gauss(r) * 0.006; flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr, gauss(r) * 0.004); }
        break;
      }
      case 21: { // двухрукавная спираль
        const arm = k % 2, t = r() * 3.4, rr = R * 0.12 + t * R * 0.25;
        const a = t * 1.9 + arm * Math.PI + gauss(r) * 0.18;
        flat(out, i, Math.cos(a) * rr, Math.sin(a) * rr, gauss(r) * 0.02 * (1 - rr / R) + (rr < R * 0.2 ? gauss(r) * 0.05 : 0));
        break;
      }
      default: { // космическая паутина: сгустки-узлы
        const c = Math.floor(r() * 70);
        const cr = rng(500 + c);
        const cx = (cr() * 2 - 1) * R, cy = CY + (cr() * 2 - 1) * R * 0.9, cz = (cr() * 2 - 1) * R * 0.6;
        out[i] = cx + gauss(r) * 0.05; out[i + 1] = cy + gauss(r) * 0.05; out[i + 2] = cz + gauss(r) * 0.05;
      }
    }
  }
  return out;
}
