import { createStage, resize } from '../scene/renderer';
import { createFigure } from '../scene/figure';
import { renderPanel } from './panel';
import { toValue } from '../registry/registry';
import { reliktPhotons, ownRadioactivity, primordialHydrogenPercent } from '../compute/body';

// --- Сцена ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);
stage.scene.add(createFigure());

function fit() { resize(stage, window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit);
fit();

function loop() {
  stage.renderer.render(stage.scene, stage.camera);
  requestAnimationFrame(loop);
}
loop();

// --- Панель: ценность ДО ввода координат (§2.4). Числа считаются в браузере (§3.7). ---
const panel = document.getElementById('panel') as HTMLElement;
const values = [
  primordialHydrogenPercent(),
  reliktPhotons(),
  ownRadioactivity(),
].map(toValue);
renderPanel(panel, values);
