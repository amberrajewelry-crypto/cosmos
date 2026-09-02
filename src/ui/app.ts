import { createStage, resize } from '../scene/renderer';
import { createFigure } from '../scene/figure';

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
