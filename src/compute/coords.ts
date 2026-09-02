// Единственная функция перевода alt/az → 3D. ВСЕ слои используют только её (§3.5).
// Система координат фиксируется раз и навсегда: +Y — зенит, −Z — Север, +X — Восток,
// азимут отсчитывается от Севера к Востоку.

export interface Vec3 { x: number; y: number; z: number; }

const D2R = Math.PI / 180;

export function altAzToXYZ(altDeg: number, azDeg: number, R: number): Vec3 {
  const A = altDeg * D2R;
  const Az = azDeg * D2R;
  return {
    x:  R * Math.cos(A) * Math.sin(Az),
    y:  R * Math.sin(A),
    z: -R * Math.cos(A) * Math.cos(Az),
  };
}
