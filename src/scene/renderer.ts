import * as THREE from 'three';

// scene/ только рисует — ничего не считает и не грузит (§3.2).
export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0820); // под туманностью-шейдером; не чёрный (§4.5)

  // near = 0.1 < минимальной дистанции зума 0.5 — объект не уходит за near-clip (fix MED-6)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1e6);
  camera.position.set(0, 1.0, 3.2);
  camera.lookAt(0, 0.9, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  return { renderer, scene, camera };
}

export function resize(stage: Stage, w: number, h: number): void {
  stage.renderer.setSize(w, h, false);
  stage.camera.aspect = w / h;
  // Портрет (мобилка): сцена — отдельное окно под hero, тело по центру, чуть дальше.
  const portrait = h > w;
  stage.camera.position.set(0, portrait ? 1.0 : 1.25, portrait ? 4.4 : 3.9);
  stage.camera.lookAt(0, portrait ? 0.95 : 1.2, 0);
  stage.camera.updateProjectionMatrix();
}
