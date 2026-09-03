import * as THREE from 'three';

// Главный образ (§4.1): тело как окно — внутри светятся точки, раскрашенные по ПРОИСХОЖДЕНИЮ
// вещества (§4.3). Доли честны по числу атомов; §4.10 — счётчик иллюстративный, не 29 млн объектов.
// Капсула вдоль Y: центр 0.85, полудлина 0.55, радиус 0.25 (совпадает с figure.ts).
const CY = 0.85, HALF = 0.55, R = 0.25;
const Y0 = CY - HALF, Y1 = CY + HALF;

// Палитра происхождения (§4.3), доли по числу атомов тела.
const ORIGINS: Array<{ frac: number; c: [number, number, number] }> = [
  { frac: 0.62,  c: [0.29, 0.25, 0.78] }, // индиго — водород Большого взрыва
  { frac: 0.36,  c: [0.75, 0.63, 0.29] }, // золото — C, N, O в звёздах
  { frac: 0.015, c: [0.80, 0.20, 0.15] }, // красный — железо из сверхновых
  { frac: 0.005, c: [0.90, 0.90, 0.96] }, // платина — слияния нейтронных звёзд
];

function insideCapsule(x: number, y: number, z: number): boolean {
  const radial = Math.hypot(x, z);
  if (y >= Y0 && y <= Y1) return radial <= R;
  const cy = y < Y0 ? Y0 : Y1;
  return Math.hypot(x, y - cy, z) <= R; // полусферические шапки
}

function colorFor(t: number): [number, number, number] {
  let acc = 0;
  for (const o of ORIGINS) { acc += o.frac; if (t <= acc) return o.c; }
  return ORIGINS[ORIGINS.length - 1].c;
}

export function createBodyParticles(count = 5000): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  let i = 0, guard = 0;
  while (i < count && guard < count * 50) {
    guard++;
    const x = (Math.random() * 2 - 1) * R;
    const z = (Math.random() * 2 - 1) * R;
    const y = Y0 - R + Math.random() * (Y1 - Y0 + 2 * R);
    if (!insideCapsule(x, y, z)) continue;
    // детерминированная раскраска по индексу (не Math.random в проде-логике цвета)
    const [r, g, b] = colorFor((i % 1000) / 1000);
    pos.set([x, y, z], i * 3);
    col.set([r, g, b], i * 3);
    i++;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, i * 3), 3));
  const mat = new THREE.PointsMaterial({
    size: 0.012, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geom, mat);
}
