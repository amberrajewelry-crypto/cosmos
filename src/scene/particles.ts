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

// Стартовая фигура — капсулы; в рантайме заменяется точками анатомического меша
// (Blender Human Base Meshes, CC0; scripts/sample-body.py → public/body.bin, int16 ×1e-4).
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

// GLSL: 3D simplex-подобный шум (value noise, 3 октавы) + curl — бездивергентное поле,
// траектории не пересекаются, точки «дышат» вокруг своего места, не разлетаясь (§4.9).
const NOISE_GLSL = `
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float n=0.; for(int z=0;z<2;z++)for(int y=0;y<2;y++)for(int x=0;x<2;x++){ vec3 o=vec3(x,y,z);
    n+=hash3(i+o).x*(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y)*(z==0?1.-f.z:f.z);} return n; }
vec3 curl(vec3 p){ float e=.1;
  float dx=vnoise(p+vec3(e,0,0))-vnoise(p-vec3(e,0,0)), dy=vnoise(p+vec3(0,e,0))-vnoise(p-vec3(0,e,0)), dz=vnoise(p+vec3(0,0,e))-vnoise(p-vec3(0,0,e));
  vec3 a=vec3(dx,dy,dz);
  float dx2=vnoise(p.yzx+vec3(e,0,0))-vnoise(p.yzx-vec3(e,0,0)), dy2=vnoise(p.yzx+vec3(0,e,0))-vnoise(p.yzx-vec3(0,e,0)), dz2=vnoise(p.yzx+vec3(0,0,e))-vnoise(p.yzx-vec3(0,0,e));
  vec3 b=vec3(dx2,dy2,dz2);
  return normalize(cross(a,b)+1e-5)*.5; }`;

const BODY_VERT = `
${NOISE_GLSL}
uniform float uTime; uniform float uPixelRatio; uniform vec3 uMouse; uniform float uMouseOn; uniform float uReveal; uniform float uMix;
uniform float uScaleA; uniform float uScaleB;
attribute float aSeed; attribute vec3 aTarget; attribute vec3 aColorB;
const vec3 PIVOT = vec3(0., .9, 0.);
varying vec3 vColor; varying float vTwinkle;
void main(){
  // §4.2 лестница масштабов: перестройка в форму другого уровня, каждая точка со своей задержкой.
  float mx = smoothstep(0., 1., clamp((uMix - fract(aSeed*.53)*.3) / .7, 0., 1.));
  vColor = mix(color, aColorB, mx);
  // Непрерывный зум: текущая форма сжимается к точке, следующая входит из-за кадра (масштаб вокруг центра фигуры).
  vec3 p = mix((position - PIVOT) * uScaleA + PIVOT, (aTarget - PIVOT) * uScaleB + PIVOT, mx);
  // §2.4 «внутри неё медленно проступают точки»: сборка из рассеяния, каждая точка со своей задержкой.
  float rv = smoothstep(0., 1., clamp((uReveal - fract(aSeed*.37)*.45) / .55, 0., 1.));
  vec3 scatter = (hash3(vec3(aSeed, aSeed*1.7, aSeed*2.3)) - .5) * vec3(2.6, 3.2, 1.6) + vec3(0., .9, 0.);
  p = mix(scatter, p, rv);
  // Дрейф curl-noise вокруг своего места: амплитуда мала — фигура держит форму.
  p += curl(position*2.4 + uTime*.06 + aSeed) * .022;
  // Курсор: точки уходят от луча в радиусе, мягко (без резкого удара).
  vec3 toM = p - uMouse; float d = length(toM.xy);
  float push = smoothstep(.3, 0., d) * uMouseOn;
  p += normalize(vec3(toM.xy, 0.) + 1e-4) * push * .09;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  // Глубина: ближние точки крупнее и ярче, дальние тонут — облако читается объёмом.
  float depth = clamp((-mv.z - 2.4) / 3.2, 0., 1.);
  vTwinkle = (.75 + .25*sin(uTime*1.7 + aSeed*31.)) * mix(.15, 1., rv) * mix(1.2, .5, depth);
  gl_PointSize = (1.6 + 3.2*fract(aSeed*7.3)) * uPixelRatio * (2.8 / -mv.z) * mix(1.25, .8, depth);
  gl_Position = projectionMatrix * mv;
}`;
const BODY_FRAG = `
uniform float uGain;
varying vec3 vColor; varying float vTwinkle;
void main(){
  vec2 c = gl_PointCoord - .5; float r = length(c);
  if (r > .5) discard;
  // Мягкий спрайт: плотное ядро + ореол (свечение без bloom-прохода).
  float core = smoothstep(.5, .0, r);
  float glow = exp(-r*r*14.) * .45;
  gl_FragColor = vec4(vColor * (core*.95 + glow), (core*.7 + glow*.4) * vTwinkle * uGain);
}`;

export interface BodyPoints {
  points: THREE.Points; setMouse: (x: number, y: number, on: number) => void; setTime: (t: number) => void; setReveal: (r: number) => void;
  /** Исходные позиции и цвета фигуры (для генерации форм уровней). */ body: Float32Array; bodyColor: Float32Array;
  /** Задать форму-цель и долю смешения 0..1; commit — сделать цель текущей позицией. */
  setTarget: (t: Float32Array) => void; setMix: (m: number) => void; commitTarget: () => void;
  /** Пара форм A→B для непрерывного зума и их масштабы вокруг центра фигуры. */
  setPair: (a: { pos: Float32Array; col: Float32Array }, b: { pos: Float32Array; col: Float32Array }) => void; setScales: (a: number, b: number) => void;
  /** Яркость спрайтов: портретная камера дальше — точки плотнее, гасим накопление. */ setGain: (g: number) => void;
  /** Заменить фигуру целиком (точки анатомического меша, public/body.bin). */ replaceBody: (b: Float32Array) => void;
}

export function createBodyParticles(count = 9000): BodyPoints {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = new Float32Array(count);
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
    seed[i] = Math.random() * 100;
    i++;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, i * 3), 3));
  geom.setAttribute('aSeed', new THREE.BufferAttribute(seed.subarray(0, i), 1));
  const bodyPos = pos.slice(0, i * 3);
  const target = new THREE.BufferAttribute(bodyPos.slice(), 3);
  geom.setAttribute('aTarget', target);
  const bodyCol = col.slice(0, i * 3);
  const colorB = new THREE.BufferAttribute(bodyCol.slice(), 3);
  geom.setAttribute('aColorB', colorB);
  const mat = new THREE.ShaderMaterial({
    vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uPixelRatio: { value: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2) },
      uMouse: { value: new THREE.Vector3(0, -10, 0) }, uMouseOn: { value: 0 }, uReveal: { value: 0 }, uMix: { value: 0 }, uGain: { value: 1 }, uScaleA: { value: 1 }, uScaleB: { value: 1 },
    },
  });
  const points = new THREE.Points(geom, mat);
  return {
    points,
    setMouse: (x, y, on) => { mat.uniforms.uMouse.value.set(x, y, 0); mat.uniforms.uMouseOn.value = on; },
    setTime: (t) => { mat.uniforms.uTime.value = t; },
    setReveal: (r) => { mat.uniforms.uReveal.value = r; },
    body: bodyPos, bodyColor: bodyCol,
    replaceBody: (b) => {
      const n = Math.min(b.length, bodyPos.length);
      bodyPos.set(b.subarray(0, n));
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      (posAttr.array as Float32Array).set(bodyPos); posAttr.needsUpdate = true;
      (target.array as Float32Array).set(bodyPos); target.needsUpdate = true;
    },
    setTarget: (t) => { (target.array as Float32Array).set(t); target.needsUpdate = true; },
    setMix: (m) => { mat.uniforms.uMix.value = m; },
    setPair: (a, b) => {
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute, colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
      (posAttr.array as Float32Array).set(a.pos); posAttr.needsUpdate = true;
      (colAttr.array as Float32Array).set(a.col); colAttr.needsUpdate = true;
      (target.array as Float32Array).set(b.pos); target.needsUpdate = true;
      (colorB.array as Float32Array).set(b.col); colorB.needsUpdate = true;
    },
    setScales: (a, b) => { mat.uniforms.uScaleA.value = a; mat.uniforms.uScaleB.value = b; },
    setGain: (g) => { mat.uniforms.uGain.value = g; },
    commitTarget: () => {
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      (posAttr.array as Float32Array).set(target.array as Float32Array); posAttr.needsUpdate = true;
      mat.uniforms.uMix.value = 0;
    },
  };
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
// Движение целиком в вершинном шейдере (без per-frame загрузки атрибутов): y = mod(y0 + v·t).
const FLUX_VERT = `
uniform float uTime; uniform float uPixelRatio;
attribute float aSpeed;
varying float vA;
void main(){
  vec3 p = position;
  p.y = mod(position.y + aSpeed * uTime, 2.3) - 0.2;
  vA = smoothstep(-.2, .1, p.y) * smoothstep(2.1, 1.7, p.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = 3.2 * uPixelRatio * (2.8 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FLUX_FRAG = `
varying float vA;
void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); if (r > .5) discard;
  float a = exp(-r*r*18.) * vA * .7; gl_FragColor = vec4(vec3(.95,.93,.86), a); }`;

export function createFlux(count = 260): { points: THREE.Points; setTime: (t: number) => void } {
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.random() * 0.34, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 2.3; pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 0.12 + Math.random() * 0.22;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: FLUX_VERT, fragmentShader: FLUX_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2) } },
  });
  return { points: new THREE.Points(geo, mat), setTime: (t) => { mat.uniforms.uTime.value = t; } };
}
