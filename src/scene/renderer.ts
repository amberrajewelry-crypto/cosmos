import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// scene/ только рисует — ничего не считает и не грузит (§3.2).
export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Кадр: bloom-проход, если включён, иначе прямой рендер. */ render: () => void;
  /** Свечение ярких точек (§4.5); выключается при деградации качества. */ setBloom: (on: boolean) => void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Шейдеры точек/фона пишут готовый цвет без colorspace_fragment; композитор bloom выводит через
  // MeshBasicMaterial, который конвертирует linear→sRGB и осветлял бы всё в 4 раза. Линейный выход = без конверсии.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0820); // под туманностью-шейдером; не чёрный (§4.5)

  // near = 0.1 < минимальной дистанции зума 0.5 — объект не уходит за near-clip (fix MED-6)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1e6);
  camera.position.set(0, 1.0, 3.2);
  camera.lookAt(0, 0.9, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // Bloom: порог выше фона-туманности, так светятся только точки; без OutputPass —
  // шейдеры точек и фона пишут готовый цвет, конвертация всё сломала бы.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.45, 0.4);
  composer.addPass(bloom);
  let bloomOn = true;
  return {
    renderer, scene, camera,
    render: () => { if (bloomOn) composer.render(); else renderer.render(scene, camera); },
    setBloom: (on) => { bloomOn = on; },
    composer, bloom,
  } as Stage & { composer: EffectComposer; bloom: UnrealBloomPass };
}

export function resize(stage: Stage, w: number, h: number): void {
  stage.renderer.setSize(w, h, false);
  const st = stage as Stage & { composer?: EffectComposer; bloom?: UnrealBloomPass };
  if (st.composer) { st.composer.setPixelRatio(stage.renderer.getPixelRatio()); st.composer.setSize(w, h); }
  // Портрет: точки плотнее и pixelRatio выше — свечение накапливается, гасим сильнее.
  if (st.bloom) st.bloom.strength = h > w ? 0.18 : 0.42;
  stage.camera.aspect = w / h;
  // Портрет (мобилка): сцена — отдельное окно под hero, тело по центру, чуть дальше.
  const portrait = h > w;
  // Десктоп: фигура во весь экран (рост 1.6 м ≈ 85 % высоты кадра при дистанции 2.0).
  stage.camera.position.set(0, portrait ? 1.0 : 0.84, portrait ? 4.4 : 2.25);
  stage.camera.lookAt(0, portrait ? 0.95 : 0.84, 0);
  stage.camera.updateProjectionMatrix();
}
