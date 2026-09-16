import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// scene/ только рисует — ничего не считает и не грузит (§3.2).
export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Кадр: bloom-проход, если включён, иначе прямой рендер. */ render: () => void;
  /** Свечение ярких точек (§4.5); выключается при деградации качества. */ setBloom: (on: boolean) => void;
  /** Подгрузить композитор и включить bloom (десктоп). */ enableBloom: () => Promise<void>;
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

  // Bloom подгружается лениво (~60 КБ): без OutputPass — шейдеры точек и фона пишут готовый цвет.
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null, bloomOn = false, size: [number, number] = [1, 1];
  const st = {
    renderer, scene, camera,
    render: () => { if (bloomOn && composer) composer.render(); else renderer.render(scene, camera); },
    setBloom: (on) => { bloomOn = on && !!composer; },
    enableBloom: async () => {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'), import('three/examples/jsm/postprocessing/RenderPass.js'), import('three/examples/jsm/postprocessing/UnrealBloomPass.js')]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.45, 0.4);
      composer.addPass(bloom);
      composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(size[0], size[1]);
      bloomOn = true;
    },
    _size: (w: number, h: number) => { size = [w, h]; if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } if (bloom) bloom.strength = h > w ? 0.18 : 0.42; },
  } as Stage & { _size: (w: number, h: number) => void };
  return st;
}

export function resize(stage: Stage, w: number, h: number): void {
  stage.renderer.setSize(w, h, false);
  (stage as Stage & { _size?: (w: number, h: number) => void })._size?.(w, h);
  stage.camera.aspect = w / h;
  // Портрет (мобилка): сцена — отдельное окно под hero, тело по центру, чуть дальше.
  const portrait = h > w;
  // Десктоп: фигура во весь экран (рост 1.6 м ≈ 85 % высоты кадра при дистанции 2.0).
  stage.camera.position.set(0, portrait ? 1.0 : 0.84, portrait ? 4.4 : 2.25);
  stage.camera.lookAt(0, portrait ? 0.95 : 0.84, 0);
  stage.camera.updateProjectionMatrix();
}
