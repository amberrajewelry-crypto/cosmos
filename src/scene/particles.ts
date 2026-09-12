import * as THREE from 'three';

// Главный образ (§4.1): ЧЕЛОВЕК, сотканный из звёзд — «космос внутри тебя» буквально.
// Точки раскрашены по ПРОИСХОЖДЕНИЮ вещества (§4.3), доли честны по числу атомов тела.

// Палитра происхождения (§4.3).
const ORIGINS: Array<{ frac: number; c: [number, number, number] }> = [
  { frac: 0.62,  c: [0.42, 0.38, 0.95] }, // индиго — водород Большого взрыва
  { frac: 0.36,  c: [0.82, 0.68, 0.32] }, // золото — C, N, O в звёздах
  { frac: 0.015, c: [0.90, 0.28, 0.20] }, // красный — железо из сверхновых
  { frac: 0.005, c: [0.95, 0.95, 1.00] }, // платина — слияния нейтронных звёзд
];

function colorFor(t: number): [number, number, number] {
  let acc = 0;
  for (const o of ORIGINS) { acc += o.frac; if (t <= acc) return o.c; }
  return ORIGINS[ORIGINS.length - 1].c;
}

// Человек как объединение сегментов-«костей» с радиусом (голова = сфера a==b).
// Ось Y вверх; стоящая фигура: стопы ~0.12, макушка ~1.66, центр ~0.9.
type Bone = { a: [number, number, number]; b: [number, number, number]; r: number };
const HUMAN: Bone[] = [
  { a: [0, 1.52, 0], b: [0, 1.52, 0], r: 0.135 },          // голова
  { a: [0, 1.34, 0], b: [0, 1.42, 0], r: 0.05 },           // шея
  { a: [0, 0.98, 0], b: [0, 1.32, 0], r: 0.155 },          // торс
  { a: [0, 0.84, 0], b: [0, 0.99, 0], r: 0.14 },           // таз
  { a: [-0.15, 1.30, 0], b: [-0.31, 0.99, 0], r: 0.052 },  // левое плечо
  { a: [-0.31, 0.99, 0], b: [-0.41, 0.70, 0.02], r: 0.046 }, // левое предплечье
  { a: [0.15, 1.30, 0], b: [0.31, 0.99, 0], r: 0.052 },    // правое плечо
  { a: [0.31, 0.99, 0], b: [0.41, 0.70, 0.02], r: 0.046 }, // правое предплечье
  { a: [-0.09, 0.85, 0], b: [-0.12, 0.47, 0], r: 0.075 },  // левое бедро
  { a: [-0.12, 0.47, 0], b: [-0.13, 0.12, 0], r: 0.052 },  // левая голень
  { a: [0.09, 0.85, 0], b: [0.12, 0.47, 0], r: 0.075 },    // правое бедро
  { a: [0.12, 0.47, 0], b: [0.13, 0.12, 0], r: 0.052 },    // правая голень
];

function distToBone(x: number, y: number, z: number, k: Bone): number {
  const ax = k.a[0], ay = k.a[1], az = k.a[2];
  const bx = k.b[0] - ax, by = k.b[1] - ay, bz = k.b[2] - az;
  const len2 = bx * bx + by * by + bz * bz || 1;
  let t = ((x - ax) * bx + (y - ay) * by + (z - az) * bz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(x - (ax + bx * t), y - (ay + by * t), z - (az + bz * t)) - k.r;
}

function insideHuman(x: number, y: number, z: number): boolean {
  for (const k of HUMAN) if (distToBone(x, y, z, k) <= 0) return true;
  return false;
}

export function createBodyParticles(count = 6500): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  let i = 0, guard = 0;
  const GUARD_MAX = count * 200;
  while (i < count && guard < GUARD_MAX) {
    guard++;
    const x = (Math.random() * 2 - 1) * 0.5;
    const y = 0.08 + Math.random() * 1.62;
    const z = (Math.random() * 2 - 1) * 0.18;
    if (!insideHuman(x, y, z)) continue;
    const [r, g, b] = colorFor((i % 1000) / 1000);
    pos.set([x, y, z], i * 3);
    col.set([r, g, b], i * 3);
    i++;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, i * 3), 3));
  const mat = new THREE.PointsMaterial({
    size: 0.011, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geom, mat);
}

// Далёкий звёздный фон — глубина «космоса вокруг», на фоне которого светится тело.
export function createStarfield(count = 1400): THREE.Points {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 28 + Math.random() * 18;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(Math.random() * 2 - 1);
    pos.set([
      r * Math.sin(ph) * Math.cos(th),
      r * Math.cos(ph) * 0.6 + 6,
      -Math.abs(r * Math.sin(ph) * Math.sin(th)) - 4,
    ], i * 3);
    const w = 0.5 + Math.random() * 0.5;
    col.set([w * 0.8, w * 0.8, w], i * 3);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.09, vertexColors: true, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return new THREE.Points(geom, mat);
}

// Поток сквозь тело (§2.3 #2/#4/#5): реликтовые фотоны/нейтрино/мюоны летят сквозь фигуру.
// Визуально — редкие белые искры, дрейфующие снизу вверх сквозь объём; при выходе за верх — заново снизу.
export function createFlux(count = 220): { points: THREE.Points; update: (dt: number) => void } {
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const reset = (i: number, y = Math.random() * 2.1 - 0.15) => {
    const r = Math.random() * 0.34, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 0.12 + Math.random() * 0.22;
  };
  for (let i = 0; i < count; i++) reset(i);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.014, color: 0xf2eee0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  return {
    points,
    update: (dt) => {
      for (let i = 0; i < count; i++) { pos[i * 3 + 1] += speed[i] * dt; if (pos[i * 3 + 1] > 2.05) reset(i, -0.15); }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
