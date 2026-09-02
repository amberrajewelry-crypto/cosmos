import * as THREE from 'three';

// M1: зум в float32-безопасном диапазоне (~6 порядков). Полный кварк↔вселенная
// (12 порядков) требует floating-origin/посценового ре-базирования — веха M6-Z (fix HIGH-3).
export type SafeLevel = 'клетка' | 'тело' | 'комната' | 'горизонт' | 'орбита';

const DIST: Record<SafeLevel, number> = {
  клетка: 0.5, тело: 3, комната: 10, горизонт: 100, орбита: 1000,
};

export function zoomTo(camera: THREE.PerspectiveCamera, level: SafeLevel): void {
  camera.position.setLength(DIST[level]); // направление сохраняем, меняем дистанцию
}
