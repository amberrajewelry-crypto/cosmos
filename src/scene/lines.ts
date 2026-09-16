import * as THREE from 'three';
import { LEVELS } from './scales';

// Линейные слои уровней (§4.2): линии, которые в точках читаются туманом, — отдельными LineSegments.
// Масштабируются синхронно с формами точек вокруг того же PIVOT (см. particles.ts BODY_VERT).
const PIVOT = new THREE.Vector3(0, 0.9, 0), CY = 0.95, R = 0.85;

function polylines(paths: number[][][], color: number, opacity: number): THREE.LineSegments {
  const pts: number[] = [];
  for (const path of paths) for (let i = 1; i < path.length; i++) pts.push(...path[i - 1], ...path[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.LineSegments(g, m);
}

// Магнитосфера: 12 меридианов × 5 оболочек L, сжатие к Солнцу (+X), хвост на ночной стороне.
export function magnetosphereLines(): THREE.LineSegments {
  const paths: number[][][] = [];
  for (let m = 0; m < 12; m++) for (let sh = 0; sh < 5; sh++) {
    // +0.5: ни один меридиан не виден с ребра — иначе яркая вертикаль по центру.
    const lon = ((m + 0.5) / 12) * Math.PI * 2, Ls = R * (0.4 + 0.12 * sh), path: number[][] = [];
    for (let i = 0; i <= 48; i++) {
      const lat = -1.35 + (2.7 * i) / 48, day = Math.cos(lat) * Math.cos(lon);
      const squash = day > 0 ? 1 - 0.3 * day : 1 + 0.9 * -day;
      const rad = Ls * Math.cos(lat) ** 2 * squash;
      if (rad < R * 0.28) { if (path.length > 1) paths.push(path.splice(0)); else path.length = 0; continue; }
      path.push([rad * Math.cos(lat) * Math.cos(lon), CY + rad * Math.sin(lat), rad * Math.cos(lat) * Math.sin(lon)]);
    }
    if (path.length > 1) paths.push(path);
  }
  return polylines(paths, 0x6a8cff, 0.5);
}

// Клетка: 24 нити цитоскелета от ядра к мембране, лёгкий изгиб.
export function cytoskeletonLines(): THREE.LineSegments {
  const NC = [R * 0.2, CY + R * 0.1, 0], paths: number[][][] = [];
  let seed = 7;
  const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let f = 0; f < 24; f++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), bend = (rnd() - 0.5) * 0.12;
    const ex = NC[0] + 1.05 * R * Math.sin(ph) * Math.cos(th), ey = NC[1] + 0.78 * R * Math.cos(ph), ez = NC[2] + R * Math.sin(ph) * Math.sin(th);
    const path: number[][] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, w = Math.sin(t * Math.PI) * bend; path.push([NC[0] + (ex - NC[0]) * t + w, NC[1] + (ey - NC[1]) * t - w, NC[2] + (ez - NC[2]) * t]); }
    paths.push(path);
  }
  return polylines(paths, 0xece6d3, 0.28);
}

export interface LevelLines { obj: THREE.Group; setZoom: (z: number, sA: number, sB: number) => void; }

// Слои по уровню; setZoom(z) повторяет масштаб/смешение форм точек: уходящая сжимается, входящая растёт.
export function createLevelLines(): LevelLines {
  const obj = new THREE.Group();
  const layers: Array<{ level: number; mesh: THREE.LineSegments; base: number }> = [];
  const add = (exp: number, mesh: THREE.LineSegments): void => {
    const level = LEVELS.findIndex((l) => l.exp === exp);
    if (level < 0) return;
    layers.push({ level, mesh, base: (mesh.material as THREE.LineBasicMaterial).opacity });
    obj.add(mesh); mesh.visible = false;
  };
  add(7, magnetosphereLines()); add(-5, cytoskeletonLines());
  const ease = (x: number): number => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  return {
    obj,
    setZoom: (z, sA, sB) => {
      const i = Math.min(LEVELS.length - 2, Math.floor(z)), k = ease(Math.min(1, Math.max(0, z - i)));
      for (const L of layers) {
        let s = 0, a = 0;
        if (L.level === i) { s = sA; a = 1 - k; } else if (L.level === i + 1) { s = sB; a = k; }
        L.mesh.visible = a > 0.02;
        if (!L.mesh.visible) continue;
        L.mesh.scale.setScalar(s); L.mesh.position.copy(PIVOT).multiplyScalar(1 - s);
        (L.mesh.material as THREE.LineBasicMaterial).opacity = L.base * a;
      }
    },
  };
}
