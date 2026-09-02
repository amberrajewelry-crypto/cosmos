import type { Computed } from '../types';

// Параметры тела, не зависящие от точки — считаются ДО ввода координат (§2.4).
// По О1 (нет 5-го входа) берём популяционные средние → честно [ОЦЕНКА] (тег ставит реестр).
// Формулы документированы; точные числа — модельные оценки по природе, не измерения.

const AVG_MASS_KG = 70;
const BODY_DENSITY = 1.01;              // г/см³ ≈ вода
const CMB_DENSITY = 411;                // реликтовых фотонов на см³ (COBE/Planck)
const K40_BQ_PER_KG = 63;               // калий-40
const C14_BQ_PER_KG = 43;               // углерод-14

// #2 — реликтовые фотоны, пронизывающие тело в данный момент. ≈ плотность CMB × объём тела.
export function reliktPhotons(massKg = AVG_MASS_KG): Computed {
  const volumeCm3 = (massKg * 1000) / BODY_DENSITY;
  return { id: 'body.relikt.photons', value: Math.round(CMB_DENSITY * volumeCm3),
    source: 'CMB 411/см³ × объём тела', computedAt: Date.now() };
}

// #3 — собственная радиоактивность: распадов K-40 + C-14 в секунду.
export function ownRadioactivity(massKg = AVG_MASS_KG): Computed {
  return { id: 'body.radioactivity', value: Math.round(massKg * (K40_BQ_PER_KG + C14_BQ_PER_KG)),
    source: 'K-40 + C-14, средние на кг', computedAt: Date.now() };
}

// #1 — доля атомов-водорода (по ЧИСЛУ атомов), синтезированных в первые минуты после БВ.
// NB: по числу, не по массе (нюанс из ревью). Модельный состав тела → [ОЦЕНКА].
export function primordialHydrogenPercent(): Computed {
  return { id: 'body.primordial.fraction', value: 62,
    source: 'состав тела по числу атомов', computedAt: Date.now() };
}
