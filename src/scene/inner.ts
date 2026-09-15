import * as THREE from 'three';

// §4.1 «тело как окно»: внутренняя жизнь фигуры по реальным данным (§2.3 #3, #4, #8).
// Всё движение — в шейдерах, per-frame только uniforms. Видимо только на уровне тела.
const PR = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);

// --- Распады K-40 / C-14 (§2.3 #3): 7400 Бк реально; показываем 1 из 70 — подпись в легенде (§4.10). ---
const DECAY_VERT = `
uniform float uTime; uniform float uPixelRatio; uniform float uOn;
attribute float aPhase; attribute float aPeriod;
varying float vF;
void main(){
  float t = mod(uTime + aPhase, aPeriod);
  vF = exp(-t * 9.) * uOn;                      // вспышка ~0.15 с, затем тьма до следующего распада
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_PointSize = (3.5 + 7. * vF) * uPixelRatio * (2.8 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DECAY_FRAG = `
varying float vF;
void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); if (r > .5 || vF < .01) discard;
  float a = exp(-r*r*10.) * vF; gl_FragColor = vec4(vec3(1., .93, .72) * (0.6 + a), a); }`;

export function createDecays(body: Float32Array, count = 420): { obj: THREE.Points; setTime: (t: number) => void; setOn: (v: number) => void; rebind: (b: Float32Array) => void } {
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), period = new Float32Array(count);
  const bind = (b: Float32Array): void => { const n = b.length / 3; for (let i = 0; i < count; i++) { const j = Math.floor(Math.random() * n); pos.set(b.subarray(j * 3, j * 3 + 3), i * 3); } };
  bind(body);
  for (let i = 0; i < count; i++) { period[i] = 2 + Math.random() * 5; phase[i] = Math.random() * period[i]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aPeriod', new THREE.BufferAttribute(period, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: DECAY_VERT, fragmentShader: DECAY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: PR }, uOn: { value: 1 } } });
  return { obj: new THREE.Points(g, m), setTime: (t) => { m.uniforms.uTime.value = t; }, setOn: (v) => { m.uniforms.uOn.value = v; },
    rebind: (b) => { bind(b); (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; } };
}

// --- Нейтрино от Солнца (§2.3 #4): направленный поток по реальной высоте/азимуту Солнца. Ночью — снизу, сквозь Землю. ---
const NU_VERT = `
uniform float uTime; uniform float uPixelRatio; uniform vec3 uDir; uniform float uOn;
attribute float aPhase; attribute float aSpeed;
varying float vA;
void main(){
  // Луч: точка старта смещена поперёк направления, бежит вдоль -uDir (от Солнца сквозь тело).
  float s = mod(aPhase + uTime * aSpeed, 3.2) - 1.6;
  vec3 p = position - uDir * s;
  vA = (1. - smoothstep(1.1, 1.6, abs(s))) * uOn;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = 2.2 * uPixelRatio * (2.8 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const NU_FRAG = `
varying float vA;
void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); if (r > .5) discard;
  float a = exp(-r*r*12.) * vA * .55; gl_FragColor = vec4(vec3(.62, .9, 1.), a); }`;

export function createNeutrinos(count = 360): { obj: THREE.Points; setTime: (t: number) => void; setSun: (altDeg: number, azDeg: number) => void; setOn: (v: number) => void } {
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), speed = new Float32Array(count);
  // Стартовые точки — в цилиндре тела; поперечное смещение задаётся самой позицией.
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 0.42, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.1 + Math.random() * 1.6; pos[i * 3 + 2] = Math.sin(a) * r * 0.5;
    phase[i] = Math.random() * 3.2; speed[i] = 0.9 + Math.random() * 0.8;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: NU_VERT, fragmentShader: NU_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: PR }, uDir: { value: new THREE.Vector3(0, 1, 0) }, uOn: { value: 0 } } });
  return {
    obj: new THREE.Points(g, m), setTime: (t) => { m.uniforms.uTime.value = t; }, setOn: (v) => { m.uniforms.uOn.value = v; },
    // Локальная система: x = восток, y = зенит, z = юг (фигура смотрит на юг — к камере). Вектор НА Солнце.
    setSun: (alt, az) => { const a = alt * Math.PI / 180, z = az * Math.PI / 180;
      m.uniforms.uDir.value.set(Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)).normalize(); },
  };
}

// --- Магнитные линии (§2.3 #8): параллельные линии сквозь тело по реальным наклонению и склонению, с бегущими штрихами по направлению поля. ---
const MAG_VERT = `
attribute float aT; varying float vT;
void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const MAG_FRAG = `
uniform float uTime; uniform float uOn; varying float vT;
void main(){
  float dash = smoothstep(.55, .95, fract(vT * 9. - uTime * .35));   // штрихи бегут по полю (в северном полушарии — вниз, к земле)
  float fade = 1. - smoothstep(.75, 1., abs(vT * 2. - 1.));
  gl_FragColor = vec4(vec3(.55, .95, .85), (0.10 + 0.32 * dash) * fade * uOn); }`;

export function createFieldLines(n = 12, len = 2.6): { obj: THREE.LineSegments; setTime: (t: number) => void; setField: (inclDeg: number, declDeg: number) => void; setOn: (v: number) => void } {
  const SEG = 40;
  const pos = new Float32Array(n * SEG * 2 * 3), tt = new Float32Array(n * SEG * 2);
  const offsets: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) offsets.push([(Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(tt, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: MAG_VERT, fragmentShader: MAG_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } } });
  const obj = new THREE.LineSegments(g, m);
  const build = (incl: number, decl: number): void => {
    const I = incl * Math.PI / 180, D = decl * Math.PI / 180;
    // Направление поля в системе (восток, зенит, юг): горизонтальная часть на север (−z) с поворотом на склонение; вертикальная — вниз при I>0.
    const d = new THREE.Vector3(Math.cos(I) * Math.sin(D), -Math.sin(I), -Math.cos(I) * Math.cos(D)).normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(d).normalize(); if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
    const v = d.clone().cross(u).normalize();
    const c = new THREE.Vector3(0, 0.9, 0);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const o = c.clone().addScaledVector(u, offsets[i][0]).addScaledVector(v, offsets[i][1]);
      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG, t1 = (s + 1) / SEG;
        const p0 = o.clone().addScaledVector(d, (t0 - 0.5) * len), p1 = o.clone().addScaledVector(d, (t1 - 0.5) * len);
        pos.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], k * 3); tt[k] = t0; tt[k + 1] = t1; k += 2;
      }
    }
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aT') as THREE.BufferAttribute).needsUpdate = true;
  };
  build(60, 5);
  return { obj, setTime: (t) => { m.uniforms.uTime.value = t; }, setOn: (v) => { m.uniforms.uOn.value = v; }, setField: build };
}
