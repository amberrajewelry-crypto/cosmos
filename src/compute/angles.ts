import {
  Observer, MakeTime, Vector, CombineRotation, Rotation_ECT_EQD, Rotation_EQD_HOR,
  RotateVector, HorizonFromVector,
} from 'astronomy-engine';
import type { Computed } from '../types';

// §4.7: настоящий асцендент и MC. Не формула из учебника астрологии, а геометрия:
// сканируем эклиптику даты (ECT) и ищем, где она пересекает горизонт на востоке (ASC)
// и меридиан над горизонтом (MC). Рефракцию не учитываем — астрологический ASC геометрический.
// Требует точное время и место рождения: без них честного ASC не бывает (ASC уходит на 1° за 4 мин).

interface Angles { asc: number; mc: number; }

function horizonFrame(lat: number, lon: number, when: Date) {
  const t = MakeTime(when);
  const obs = new Observer(lat, lon, 0);
  const rot = CombineRotation(Rotation_ECT_EQD(t), Rotation_EQD_HOR(t, obs));
  return (lambdaDeg: number) => {
    const a = (lambdaDeg * Math.PI) / 180;
    const v = RotateVector(rot, new Vector(Math.cos(a), Math.sin(a), 0, t));
    // HOR: x=север, y=запад, z=зенит
    return { alt: HorizonFromVector(v, null as unknown as string).lat, west: v.y, up: v.z };
  };
}

// Уточнение корня f(λ)=0 бисекцией на [a,b], где знак меняется.
function bisect(f: (x: number) => number, a: number, b: number): number {
  let fa = f(a);
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m;
  }
  return ((a + b) / 2 + 360) % 360;
}

export function ascMc(lat: number, lon: number, when: Date): Angles {
  const h = horizonFrame(lat, lon, when);
  const STEP = 1;
  let asc = NaN, mc = NaN;
  for (let l = 0; l < 360; l += STEP) {
    const p = h(l), q = h(l + STEP);
    // ASC: горизонт пересекается снизу вверх? Нет — ASC = точка на горизонте в восточной половине (west<0).
    if ((p.alt < 0) !== (q.alt < 0) && p.west < 0) asc = bisect((x) => h(x).alt, l, l + STEP);
    // MC: пересечение меридиана (west=0) над горизонтом.
    if ((p.west < 0) !== (q.west < 0) && p.up > 0) mc = bisect((x) => h(x).west, l, l + STEP);
  }
  return { asc: Math.round(asc * 100) / 100, mc: Math.round(mc * 100) / 100 };
}

export function ascendant(lat: number, lon: number, when: Date): Computed {
  return { id: 'natal.asc', value: ascMc(lat, lon, when).asc, source: 'astronomy-engine (геометрия ECT→HOR)', computedAt: Date.now() };
}
export function midheaven(lat: number, lon: number, when: Date): Computed {
  return { id: 'natal.mc', value: ascMc(lat, lon, when).mc, source: 'astronomy-engine (геометрия ECT→HOR)', computedAt: Date.now() };
}
