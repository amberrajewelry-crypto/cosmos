import { createStage, resize } from '../scene/renderer';
import { createFigure } from '../scene/figure';
import { renderPanel } from './panel';
import { toValue } from '../registry/registry';
import { reliktPhotons, ownRadioactivity, primordialHydrogenPercent } from '../compute/body';
import { sunAltitude, sunAzimuth, moonAltitude } from '../compute/sky';
import { shadowRatio } from '../compute/shadow';
import { constellationVsSign } from '../compute/sign';
import type { Value } from '../types';

// --- Сцена ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);
stage.scene.add(createFigure());

function fit() { resize(stage, window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit);
fit();

(function loop() {
  stage.renderer.render(stage.scene, stage.camera);
  requestAnimationFrame(loop);
})();

// --- Параметры тела: ценность ДО ввода координат (§2.4). Считаются в браузере (§3.7). ---
const bodyValues: Value[] = [
  primordialHydrogenPercent(),
  reliktPhotons(),
  ownRadioactivity(),
].map(toValue);

const panel = document.getElementById('panel') as HTMLElement;
function render(sky: Value[] = []) { renderPanel(panel, [...sky, ...bodyValues]); }
render();

// --- «Показать, что происходит именно с тобой» → гео + сейчас (§2.4). Координаты не уходят на сервер. ---
const btn = document.getElementById('reveal') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLElement;

btn.addEventListener('click', () => {
  if (!navigator.geolocation) { status.textContent = 'Геолокация недоступна в этом браузере.'; return; }
  status.textContent = 'Определяю твою точку…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const now = new Date();
      const sky: Value[] = [
        constellationVsSign(now),
        sunAltitude(lat, lon, now),
        sunAzimuth(lat, lon, now),
        moonAltitude(lat, lon, now),
        shadowRatio(lat, lon, now),
      ].map(toValue);
      render(sky);
      status.textContent = 'Твоё небо — сверху панели. Координаты остались в браузере.';
      btn.hidden = true;
    },
    () => { status.textContent = 'Без геолокации небо в твоей точке не показать. Тело — уже здесь.'; },
    { enableHighAccuracy: false, timeout: 10_000 },
  );
});
