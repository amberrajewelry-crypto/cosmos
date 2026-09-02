import type { Computed } from '../types';

// Параметры, не зависящие от точки. По О1 (нет 5-го входа) — популяционные средние → [ОЦЕНКА].
const AVG_HEIGHT_M = 1.7;
const G = 9.81;                    // м/с²
const C = 2.998e8;                 // м/с

// #9 — скорость относительно реликтового излучения (диполь CMB). Константа [ГЛОБ].
export function cmbVelocity(): Computed {
  return { id: 'physics.cmb.velocity', value: 370, source: 'диполь CMB (Planck)', computedAt: Date.now() };
}

// #6 — градиент времени голова/ноги. GR: Δ(темпа) = g·h/c² за секунду → нс за год.
export function timeGradient(heightM = AVG_HEIGHT_M): Computed {
  const nsPerYear = (G * heightM / (C * C)) * 3.156e7 * 1e9; // ×сек/год ×нс/с
  return { id: 'physics.time.gradient', value: Math.round(nsPerYear * 100) / 100,
    source: 'GR g·h/c², средний рост', computedAt: Date.now() };
}

// #5 — мюоны сквозь тело: ~1/см²/мин × сечение тела. Оценка [ОЦЕНКА].
export function muonFlux(): Computed {
  const perMin = Math.round(1 * 600); // ~600 см² верхнего сечения × 1/см²/мин
  return { id: 'flux.muon', value: perMin, source: '~1/см²/мин × сечение тела', computedAt: Date.now() };
}
